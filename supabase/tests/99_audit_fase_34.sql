-- =====================================================================
-- Fase 34 — Audit: controlli strutturali di sicurezza, RLS negativi, GDPR
-- =====================================================================
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- 1. Controlli strutturali (valgono per ogni tabella e funzione, anche future)
-- ---------------------------------------------------------------------
begin;
reset role;
select tests.expect((select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) = 0, 'RLS attiva su tutte le tabelle pubbliche');
select tests.expect((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')) = 0, 'ogni funzione SECURITY DEFINER ha search_path fisso');
select tests.expect((select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) = 0, 'gli anonimi non scrivono direttamente in nessuna tabella');
select tests.expect((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v' and not coalesce('security_invoker=true' = any(c.reloptions), false)) = 0, 'tutte le viste rispettano la RLS (security_invoker)');
select tests.expect((select count(*) from storage.buckets where file_size_limit is null or allowed_mime_types is null) = 0, 'ogni bucket ha limite di dimensione e tipi ammessi');
select tests.expect((select array_agg(id order by id) from storage.buckets where public)
  = array['avatars', 'blog-images', 'business-media', 'listing-images', 'listing-videos'], 'solo i bucket previsti sono pubblici');
-- Funzioni SECURITY DEFINER eseguibili da anonimi: elenco chiuso e revisionato.
select tests.expect((select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('booking_public_settings', 'booking_slots', 'founding_partner_profiles', 'inspection_due_date', 'inspection_slots', 'join_beta',
      'listings_within', 'map_search', 'marketing_unsubscribe', 'professional_locations', 'profile_reputation',
      'public_roadside_operators', 'search_inspection_centers', 'search_offers', 'search_professionals', 'seo_local_pages', 'seo_neo_bands',
      'submit_partner_application', 'track_event', 'track_listing_view', 'track_offer', 'track_part_view', 'track_profile_view',
      'report_client_error', 'health_check')) = '{}', 'nessuna nuova funzione privilegiata aperta agli anonimi senza revisione');
select tests.expect(not has_function_privilege('anon', 'public.my_businesses()', 'execute'), 'my_businesses non eseguibile da anonimi');
-- Migrazione 0029: privilegi minimi su viste e funzioni (verifica post-applicazione 20/11/2026).
select tests.expect(not has_function_privilege('anon', 'public.listing_favorite_count(uuid)', 'execute'), 'listing_favorite_count non eseguibile da anonimi');
select tests.expect(not has_function_privilege('anon', 'public.valuation_professionals(text, integer)', 'execute'), 'valuation_professionals non eseguibile da anonimi');
select tests.expect(has_function_privilege('authenticated', 'public.valuation_professionals(text, integer)', 'execute'), 'valuation_professionals eseguibile dagli utenti autenticati');
select tests.expect((select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('listing_search', 'part_search')
  and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT') = 0, 'viste di ricerca: solo lettura per anon e authenticated');
select tests.expect(has_table_privilege('anon', 'public.listing_search', 'select') and has_table_privilege('anon', 'public.part_search', 'select'), 'viste di ricerca leggibili dagli anonimi');
select tests.expect((select count(*) from pg_indexes where schemaname = 'public' and tablename = 'favorites' and indexname = 'favorites_user_part_uniq') = 0, 'nessun indice duplicato sui preferiti');
-- Le funzioni interne non sono richiamabili dai client.
select tests.expect((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname in ('rewards_sync', 'expire_points', 'run_marketing_workflows', 'erase_user_data', 'marketing_audience', 'unsubscribe_token')
    and has_function_privilege('authenticated', p.oid, 'execute')) = 0, 'funzioni interne non eseguibili dagli utenti');
rollback;

-- ---------------------------------------------------------------------
-- 2. RLS negativa: anonimi
-- ---------------------------------------------------------------------
begin;
select tests.as_anon();
select tests.expect_error($$select count(*) from public.profiles$$, 'anonimo: profili non leggibili');
select tests.expect_error($$select count(*) from public.messages$$, 'anonimo: messaggi non leggibili');
select tests.expect_error($$select count(*) from public.notifications$$, 'anonimo: notifiche non leggibili');
select tests.expect_error($$select count(*) from public.requests$$, 'anonimo: richieste non leggibili');
select tests.expect_error($$select count(*) from public.email_outbox$$, 'anonimo: coda email non leggibile');
select tests.expect_error($$select count(*) from public.admin_audit_logs$$, 'anonimo: registro attività non leggibile');
select tests.expect_error($$select count(*) from public.user_roles$$, 'anonimo: ruoli non leggibili');
select tests.expect_error($$select count(*) from public.points_ledger$$, 'anonimo: movimenti punti non leggibili');
select tests.expect_error($$select count(*) from public.user_acquisition$$, 'anonimo: attribuzione non leggibile');
select tests.expect_error($$select count(*) from public.insurance_quote_requests$$, 'anonimo: richieste assicurative non leggibili');
select tests.expect_error($$select count(*) from public.app_errors$$, 'anonimo: errori applicativi non leggibili');
select tests.expect_error($$select public.export_my_data()$$, 'anonimo: nessuna esportazione');
select tests.expect((select count(*) from public.vehicle_listings where status not in ('pubblicato', 'venduto')) = 0, 'anonimo: solo annunci pubblicati o venduti (bozze, revisioni e sospesi esclusi)');
select tests.expect((select count(*) from public.reward_items where status <> 'pubblicato') = 0, 'anonimo: solo premi pubblicati');
select tests.expect((select count(*) from public.landing_pages where status <> 'pubblicata') = 0, 'anonimo: solo landing pubblicate');
rollback;

-- ---------------------------------------------------------------------
-- 3. RLS negativa: un utente non vede né modifica i dati di un altro
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
insert into public.requests (kind, requester_id, professional_profile_id, subject, message) values ('preventivo', tests.id('cliente'), tests.id('pp_officina'), 'Audit privato', 'Richiesta privata del cliente per il controllo di accesso');
insert into public.user_vehicles (owner_id, make, model) values (tests.id('cliente'), 'Fiat', 'Panda');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.requests where subject = 'Audit privato') = 0, 'altro utente: richiesta non visibile');
select tests.expect((select count(*) from public.user_vehicles where owner_id = tests.id('cliente')) = 0, 'altro utente: garage non visibile');
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente')) = 0, 'altro utente: notifiche non visibili');
select tests.expect((select count(*) from public.profiles where id = tests.id('cliente') and phone is not null) = 0, 'altro utente: dati di contatto non visibili');
select tests.expect_error($$update public.requests set status = 'completata' where subject = 'Audit privato'$$, 'altro utente: lo stato della richiesta non è scrivibile dal client');
update public.user_vehicles set model = 'Hackerata' where owner_id = tests.id('cliente');
reset role;
select tests.expect((select status <> 'completata' from public.requests where subject = 'Audit privato'), 'altro utente: non modifica la richiesta');
select tests.expect((select count(*) from public.user_vehicles where model = 'Hackerata') = 0, 'altro utente: non modifica il garage');
-- Escalation di privilegi
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$insert into public.user_roles (user_id, role) values (tests.id('cliente'), 'admin')$$, 'nessuna auto-assegnazione di ruoli');
select tests.expect_error($$update public.profiles set account_status = 'attivo' where id = tests.id('cliente')$$, 'stato account non modificabile dall''utente');
select tests.expect_error($$update public.platform_settings set value = 'true' where key = 'rewards_enabled'$$, 'impostazioni non modificabili');
select tests.expect_error($$select public.admin_set_setting('rewards_enabled', to_jsonb(true))$$, 'impostazioni riservate allo staff');
select tests.expect_error($$update public.professional_profiles set review_status = 'approvato' where user_id = tests.id('officina')$$, 'nessuna auto-approvazione dei professionisti');
-- Tipi dei valori delle impostazioni (il pannello invia booleani JSON)
select tests.as_user(tests.id('admin'));
select public.admin_set_setting('rewards_enabled', to_jsonb(true));
select tests.expect_error($$select public.admin_set_setting('rewards_enabled', to_jsonb('true'::text))$$, 'impostazione booleana: una stringa viene rifiutata');
rollback;

-- ---------------------------------------------------------------------
-- 4. GDPR: esportazione completa, cancellazione, eliminazione dell'account
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
create temp table _exp as select public.export_my_data() d;
select tests.expect((select d ?& array['profilo', 'richieste', 'garage', 'offerte_richieste', 'visite_e_test_drive', 'soccorso_stradale', 'trasporti', 'revisioni',
  'richieste_assicurative', 'valutazioni', 'permute', 'rewards_movimenti', 'rewards_premi', 'inviti_inviati', 'provenienza_registrazione',
  'storico_consensi_marketing', 'comunicazioni_promozionali', 'notifiche'] from _exp), 'esportazione: comprende i dati di tutte le aree');
select tests.expect((select (d -> 'profilo' ->> 'id')::uuid = tests.id('cliente') from _exp), 'esportazione: solo i propri dati');
reset role;
insert into public.account_deletion_requests (user_id, reason) values (tests.id('cliente2'), 'Non uso più il servizio');
select tests.as_user(tests.id('admin'));
select public.admin_process_deletion((select id from public.account_deletion_requests where user_id = tests.id('cliente2')), 'completata', 'Nessun obbligo di conservazione aggiuntivo');
reset role;
select tests.expect((select account_status = 'disattivato' and full_name is null and phone is null and email like 'eliminato-%@invalid.local' from public.profiles where id = tests.id('cliente2')), 'cancellazione: profilo pseudonimizzato, email non più leggibile');
select tests.expect((select count(*) from public.user_acquisition where user_id = tests.id('cliente2')) = 0, 'cancellazione: attribuzione eliminata');
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente2')) = 0, 'cancellazione: notifiche eliminate');
select tests.expect((select count(*) from public.marketing_consent_log where user_id = tests.id('cliente2') and source = 'cancellazione') <= 1, 'cancellazione: consenso marketing revocato e tracciato');
select tests.expect((select count(*) from public.admin_audit_logs where action = 'gdpr.deletion_completata') = 1, 'cancellazione registrata');
-- Eliminazione definitiva dell'account di autenticazione: la cascata non è bloccata dagli storici immutabili.
delete from auth.users where id = tests.id('dealer');
select tests.expect((select count(*) from public.profiles where id = tests.id('dealer')) = 0, 'eliminazione account: cascata completa');
rollback;

-- ---------------------------------------------------------------------
-- 5. Registro errori senza dati personali
-- ---------------------------------------------------------------------
begin;
select tests.as_anon();
select public.report_client_error('Errore per mario.rossi@example.com tel +39 333 1234567 id 10000000-0000-0000-0000-000000000001', '/auto/test', 'abc123', 'mobile');
select tests.expect((select (public.health_check()) ->> 'database' = 'ok'), 'controllo di salute');
reset role;
select tests.expect((select message !~ '@|333|10000000' from public.app_errors order by id desc limit 1), 'errore salvato senza email, telefono o identificativi');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.app_errors) = 0, 'errori visibili solo allo staff');
rollback;

select '=== AUDIT FASE 34 SUPERATO ===';

-- =====================================================================
-- Test migrazione 0017 (Fasi 11–14): candidature, Beta, CRM unico,
-- Founding Partners, marketing, analytics, notifiche staff, pannello.
-- Usa i dati di prova di 20_fasi_3_10.sql (utenti e ruoli).
-- =====================================================================
\set ON_ERROR_STOP on

-- Candidatura pubblica: crea candidatura + contatto CRM, notifica lo staff, evento senza dati personali
begin;
select tests.as_anon();
select public.submit_partner_application('partner_auto', 'concessionario', 'Auto Navigli Srl', 'Luca Bianchi', 'Info@AutoNavigli.it',
  '02 1234567', 'Via Vigevano 1', 'Milano', 25, 'Vorremmo pubblicare le nostre auto', true, true, '/partner', 'instagram', 'paid_social', 'partner-dic', null);
select tests.expect_error($$select count(*) from public.partner_applications$$, 'i visitatori non leggono le candidature');
select tests.as_service();
select tests.expect((select count(*) from public.partner_applications where email = 'info@autonavigli.it' and status = 'nuova') = 1, 'candidatura salvata con email normalizzata');
select tests.expect((select count(*) from public.field_contacts where email = 'info@autonavigli.it' and source = 'candidatura' and status = 'nuovo') = 1,
  'la candidatura crea un contatto nel CRM unico (nessun sistema duplicato)');
select tests.expect((select count(*) from public.notifications n join public.user_roles r on r.user_id = n.user_id where r.role = 'admin' and n.title like 'Nuova candidatura partner%') >= 1,
  'lo staff con permesso acquisizione riceve una notifica interna');
select tests.expect((select count(*) from public.analytics_events where event = 'candidatura_partner' and utm_campaign = 'partner-dic') = 1, 'conversione misurata con la campagna');
select tests.expect((select count(*) from public.analytics_events where meta::text ilike '%autonavigli%' or meta::text ilike '%bianchi%') = 0,
  'nessun dato personale negli eventi di analytics');
rollback;

begin;
select tests.as_anon();
select tests.expect_error($$select public.submit_partner_application('partner_auto','concessionario','X Srl','Mario Rossi','a@b.it','021234567',null,'Milano',null,null,false,false)$$,
  'senza presa visione dell''informativa la candidatura è rifiutata');
select tests.expect_error($$select public.submit_partner_application('partner_auto','concessionario','X Srl','Mario Rossi','non-email','021234567',null,'Milano',null,null,false,true)$$,
  'email non valida rifiutata');
select public.submit_partner_application('partner_professionisti','officina','Bot Spa','Bot','bot@spam.it','021234567',null,'Milano',null,null,false,true,null,null,null,null,'http://spam');
select tests.as_service();
select tests.expect((select count(*) from public.partner_applications where email = 'bot@spam.it') = 0, 'il campo trappola scarta gli invii automatici');
select tests.as_anon();
select public.submit_partner_application('partner_professionisti','officina','Rip 1','Anna Verdi','rip@test.it','021234567',null,'Milano',null,null,false,true);
select public.submit_partner_application('partner_professionisti','officina','Rip 2','Anna Verdi','rip@test.it','021234567',null,'Milano',null,null,false,true);
select public.submit_partner_application('partner_professionisti','officina','Rip 3','Anna Verdi','rip@test.it','021234567',null,'Milano',null,null,false,true);
select tests.expect_error($$select public.submit_partner_application('partner_professionisti','officina','Rip 4','Anna Verdi','rip@test.it','021234567',null,'Milano',null,null,false,true)$$,
  'limite anti-spam: massimo 3 candidature al giorno per email');
rollback;

-- Beta
begin;
select tests.as_anon();
select public.join_beta('Neo@Example.it', 'neopatentato', 'Milano', true, '/prima-auto', 'tiktok', null, 'neo-1');
select public.join_beta('neo@example.it', 'neopatentato', 'Milano', true);
select tests.expect_error($$select count(*) from public.beta_signups$$, 'i visitatori non leggono gli iscritti');
select tests.as_service();
select tests.expect((select count(*) from public.beta_signups where lower(email) = 'neo@example.it') = 1, 'iscrizione unica per email');
select tests.as_user(tests.id('moderatore'));
select tests.expect((select count(*) from public.beta_signups) = 0, 'il moderatore (senza acquisizione) non vede gli iscritti');
rollback;

-- CRM: pipeline, storico immutabile, permessi
begin;
select tests.as_user(tests.id('admin'));
insert into public.field_contacts (id, business_name, business_type, city, status) values ('41000000-0000-0000-0000-000000000001', 'Officina Lambrate', 'officina', 'Milano', 'nuovo');
update public.field_contacts set status = 'interessato' where id = '41000000-0000-0000-0000-000000000001';
select tests.expect((select first_contact_on = current_date from public.field_contacts where id = '41000000-0000-0000-0000-000000000001'),
  'la data del primo contatto si compila al primo cambio di stato');
insert into public.field_visits (contact_id, kind, met_contact_name, cars_available, neo_cars_available, interest_level, next_action, next_action_on)
values ('41000000-0000-0000-0000-000000000001', 'visita', 'Giorgio', 12, 4, 'alto', 'Inviare la presentazione', current_date + 3);
select tests.expect((select next_followup_on = current_date + 3 from public.field_contacts where id = '41000000-0000-0000-0000-000000000001'),
  'la prossima azione della visita aggiorna il follow-up');
select tests.expect((select count(*) from public.field_contact_history where contact_id = '41000000-0000-0000-0000-000000000001') >= 3,
  'storico: creazione, cambio di stato e visita registrati');
select tests.expect_error($$insert into public.field_visits (contact_id, kind, cars_available, neo_cars_available) values ('41000000-0000-0000-0000-000000000001','visita',2,5)$$,
  'le auto per neopatentati non possono superare quelle disponibili');
select tests.expect_error($$update public.field_contacts set status = 'collaborazione_attiva' where id = '41000000-0000-0000-0000-000000000001'$$, 'solo gli stati della pipeline ufficiale');
select tests.as_service();
select tests.expect_error($$delete from public.field_contact_history$$, 'lo storico del CRM non si può cancellare');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.field_contacts) = 0, 'un cliente non vede il CRM');
select tests.expect_error($$insert into public.field_contacts (business_name, business_type) values ('Hack', 'officina')$$, 'un cliente non può scrivere nel CRM');
rollback;

-- Founding Partners: badge solo per ammessi con profilo pubblico
begin;
select tests.as_user(tests.id('admin'));
insert into public.field_contacts (id, business_name, business_type, city) values ('41000000-0000-0000-0000-000000000002', 'Officina Test Founding', 'officina', 'Milano');
select tests.expect((select count(*) from public.founding_partner_profiles(array[tests.id('pp_officina')])) = 0, 'nessun badge prima dell''ammissione');
select public.admin_set_founding_partner('41000000-0000-0000-0000-000000000002', tests.id('pp_officina'), true, 'Primo partner');
select tests.as_service();
update public.professional_profiles set is_published = true, review_status = 'approvato', city = 'Milano' where id = tests.id('pp_officina');
select tests.as_anon();
select tests.expect((select count(*) from public.founding_partner_profiles(array[tests.id('pp_officina')])) = 1, 'badge visibile dopo l''ammissione');
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_set_founding_partner('41000000-0000-0000-0000-000000000002', null, false, '')$$, 'la revoca richiede una motivazione');
select public.admin_set_founding_partner('41000000-0000-0000-0000-000000000002', null, false, 'Partner non più attivo');
select tests.as_anon();
select tests.expect((select count(*) from public.founding_partner_profiles(array[tests.id('pp_officina')])) = 0, 'badge rimosso dopo la revoca');
select tests.as_user(tests.id('moderatore'));
select tests.expect_error($$select public.admin_set_founding_partner('41000000-0000-0000-0000-000000000002', null, true, null)$$, 'solo chi gestisce l''acquisizione ammette partner');
rollback;

-- Marketing: permessi, pubblicazione dichiarata solo con data, esperimenti con campione minimo
begin;
select tests.as_user(tests.id('admin'));
insert into public.marketing_campaigns (id, name, audience, utm_campaign) values ('42000000-0000-0000-0000-000000000001', 'Neo Milano', 'neopatentati', 'neo-milano');
select tests.expect_error($$update public.marketing_campaigns set status = 'pubblicato' where id = '42000000-0000-0000-0000-000000000001'$$,
  'una campagna non può risultare pubblicata senza data reale di pubblicazione');
update public.marketing_campaigns set status = 'approvato' where id = '42000000-0000-0000-0000-000000000001';
select tests.expect((select approved_by = tests.id('admin') from public.marketing_campaigns where id = '42000000-0000-0000-0000-000000000001'), 'chi approva viene registrato');
select tests.expect((select count(*) from public.marketing_status_history where entity_id = '42000000-0000-0000-0000-000000000001') = 2, 'storico degli stati della campagna');
insert into public.growth_experiments (title, hypothesis, change_description, metric, variant_a, variant_b) values ('Headline', 'Se parliamo di sicurezza, più clic', 'Titolo', 'CTR', 'A', 'B');
select tests.expect_error($$update public.growth_experiments set decision = 'adotta_b', sample_a = 20, sample_b = 20$$, 'nessuna variante vincente senza dati sufficienti');
select tests.as_user(tests.id('moderatore'));
select tests.expect((select count(*) from public.marketing_campaigns) = 0, 'il moderatore non vede il marketing');
rollback;

-- Analytics: solo eventi ammessi, nessun accesso pubblico in lettura
begin;
select tests.as_anon();
select public.track_event('page_view', '/milano', '/milano', 'instagram', 'paid', 'neo-milano', null, 'l.instagram.com', 'mobile', true, '{}'::jsonb);
select public.track_event('email_utente', '/milano');
select public.track_event('page_view', 'javascript:alert(1)');
select tests.expect_error($$select count(*) from public.analytics_events$$, 'i visitatori non leggono gli eventi');
select tests.as_service();
select tests.expect((select count(*) from public.analytics_events where event = 'page_view' and utm_campaign = 'neo-milano' and is_entry) = 1, 'pagina vista registrata con la campagna');
select tests.expect((select count(*) from public.analytics_events where event = 'email_utente' or path like 'javascript%') = 0, 'eventi e percorsi non ammessi scartati');
select tests.as_user(tests.id('admin'));
select tests.expect(((public.admin_growth_stats(30)) -> 'traffic' ->> 'page_views')::int >= 1, 'la dashboard legge i dati reali');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.admin_growth_stats(30)$$, 'un cliente non accede alle statistiche');
rollback;

-- Pannello: modifica e rimozione annunci, attività recenti
begin;
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_edit_listing('30000000-0000-0000-0000-000000000001', 'Nuovo titolo', null, null, '')$$, 'la modifica richiede una motivazione');
select public.admin_edit_listing('30000000-0000-0000-0000-000000000001', 'Titolo corretto dallo staff', null, null, 'Titolo fuorviante');
select tests.expect((select title from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'Titolo corretto dallo staff', 'lo staff modifica il titolo');
select tests.expect((select count(*) from public.admin_audit_logs where action = 'listing.edited') = 1, 'modifica registrata nel registro attività');
select tests.expect_error($$select public.admin_delete_listing('30000000-0000-0000-0000-000000000001', 'Annuncio duplicato da rimuovere')$$, 'un annuncio pubblicato va prima sospeso');
select tests.expect(jsonb_array_length(public.admin_recent_activity(5) -> 'registrations') >= 1, 'ultime registrazioni reali');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.admin_recent_activity(5)$$, 'nessun accesso alle attività per gli utenti normali');
select tests.expect_error($$select public.admin_edit_listing('30000000-0000-0000-0000-000000000001', 'x titolo', null, null, 'motivo valido')$$, 'un utente normale non modifica annunci altrui');
rollback;

-- Notifiche allo staff: nuova segnalazione
begin;
select tests.as_user(tests.id('cliente'));
insert into public.content_reports (reporter_id, target_type, target_id, category, description) values (tests.id('cliente'), 'annuncio_auto', '30000000-0000-0000-0000-000000000001', 'informazioni_ingannevoli', 'Prezzo non realistico');
select tests.as_service();
select tests.expect((select count(*) from public.notifications n where n.user_id = tests.id('moderatore') and n.title = 'Nuova segnalazione: informazioni ingannevoli') = 1,
  'il moderatore riceve la notifica della segnalazione');
select tests.expect((select count(*) from public.notifications n where n.user_id = tests.id('cliente') and n.title like 'Nuova segnalazione%') = 0, 'chi segnala non riceve notifiche staff');
rollback;

select '=== TEST FASI 11–14 SUPERATI ===';

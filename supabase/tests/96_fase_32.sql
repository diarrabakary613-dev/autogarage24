-- =====================================================================
-- Test migrazione 0026 (Fase 32): Growth Engine
-- =====================================================================
\set ON_ERROR_STOP on

begin;
-- Attribuzione alla registrazione (solo valori conformi)
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000061', 'utm@test.local', '{"full_name":"Utente Utm","accepted_terms":"true","marketing_consent":"true","utm_source":"instagram","utm_campaign":"lancio_milano","landing":"/prima-auto"}'),
  ('10000000-0000-0000-0000-000000000062', 'utm2@test.local', '{"full_name":"Utente Due","accepted_terms":"true","utm_source":"<script>","landing":"//evil.example"}');
select tests.expect((select utm_source = 'instagram' and utm_campaign = 'lancio_milano' and landing = '/prima-auto' from public.user_acquisition where user_id = '10000000-0000-0000-0000-000000000061'), 'UTM e landing salvati alla registrazione');
select tests.expect((select utm_source is null and landing is null from public.user_acquisition where user_id = '10000000-0000-0000-0000-000000000062'), 'valori non conformi scartati');
select tests.expect((select count(*) from public.marketing_consent_log where user_id = '10000000-0000-0000-0000-000000000061' and consent and source = 'registrazione') = 1, 'consenso registrato con la fonte');

select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.user_acquisition where user_id <> tests.id('cliente')) = 0, 'un utente non vede l''attribuzione altrui');
select tests.expect_error($$select public.admin_growth_center(30)$$, 'Growth Center riservato allo staff');
select tests.expect_error($$insert into public.landing_pages (slug, title, headline, cta_label, cta_path) values ('test-lp', 'Titolo landing', 'Headline di prova', 'Vai', '/registrati')$$, 'solo lo staff crea landing');

-- Growth Center con filtri
select tests.as_user(tests.id('admin'));
select tests.expect(((public.admin_growth_center(30, 'instagram')) ->> 'registrazioni')::integer = 1, 'filtro per sorgente');
select tests.expect(((public.admin_growth_center(30, null, 'lancio_milano')) ->> 'registrazioni')::integer = 1, 'filtro per campagna');
select tests.expect(((public.admin_growth_center(30)) ->> 'registrazioni')::integer >= 12, 'totale registrazioni reali');

-- Landing page
insert into public.landing_pages (slug, title, headline, cta_label, cta_path, section, variant_b_headline, experiment_active, status)
values ('prima-auto-milano', 'Prima auto a Milano', 'Trova la tua prima auto', 'Cerca ora', '/auto-per-neopatentati', 'auto_neopatentati', 'La prima auto, senza sorprese', true, 'pubblicata');
select tests.expect_error($$insert into public.landing_pages (slug, title, headline, cta_label, cta_path) values ('esterna', 'Titolo landing', 'Headline di prova', 'Vai', '//evil.example')$$, 'CTA verso siti esterni rifiutata');
select tests.expect_error($$insert into public.landing_pages (slug, title, headline, cta_label, cta_path, experiment_active) values ('ab-vuoto', 'Titolo landing', 'Headline di prova', 'Vai', '/x', true)$$, 'esperimento senza variante rifiutato');
select tests.as_anon();
select tests.expect((select count(*) from public.landing_pages where slug = 'prima-auto-milano') = 1, 'landing pubblicata visibile');
select public.track_event('lp_view', '/lp/prima-auto-milano', p_meta => '{"lp":"prima-auto-milano","variant":"a"}');
select public.track_event('lp_view', '/lp/prima-auto-milano', p_meta => '{"lp":"prima-auto-milano","variant":"b"}');
select public.track_event('lp_cta', '/lp/prima-auto-milano', p_meta => '{"lp":"prima-auto-milano","variant":"b"}');
select public.track_event('lp_view', '/lp/prima-auto-milano', p_meta => '{"lp":"prima-auto-milano","variant":"z"}');
select tests.as_user(tests.id('admin'));
select tests.expect((select views = 1 and cta_clicks = 1 from public.admin_landing_results('prima-auto-milano') where variant = 'b'), 'risultati per variante');
select tests.expect((select sum(views) = 2 from public.admin_landing_results('prima-auto-milano')), 'variante non valida scartata');

-- Email promozionali: approvazione del fondatore, consenso, esclusioni
insert into public.marketing_messages (subject, body, cta_path, channels, segment, status)
values ('Novità di novembre', 'Sono arrivate nuove officine verificate nella tua zona: dai un''occhiata.', '/trova-officina', '{email,in_app}', '{}', 'da_approvare');
insert into tests.ids select 'msg1', id from public.marketing_messages where subject = 'Novità di novembre';
select tests.expect_error($$update public.marketing_messages set status = 'approvato' where id = tests.id('msg1')$$, 'lo stato «approvato» non si imposta a mano');
select tests.expect_error($$insert into public.marketing_messages (subject, body, segment) values ('Segmento libero', 'Corpo del messaggio di prova abbastanza lungo', '{"sql":"1=1"}')$$, 'segmento con chiavi non ammesse rifiutato');
select tests.expect_error($$select public.admin_send_marketing_message(tests.id('msg1'))$$, 'non si invia senza approvazione');
reset role;
insert into public.user_roles (user_id, role) values (tests.id('operatore'), 'admin');
select tests.as_user(tests.id('operatore'));
select tests.expect_error($$select public.admin_approve_marketing_message(tests.id('msg1'))$$, 'un admin non fondatore non approva');
select tests.as_user(tests.id('admin'));
select tests.expect(((public.admin_marketing_audience('{}')) ->> 'email_con_consenso')::integer = 1, 'anteprima: solo chi ha dato il consenso');
select public.admin_approve_marketing_message(tests.id('msg1'));
create temp table _r as select public.admin_send_marketing_message(tests.id('msg1')) r;
select tests.expect((select (r ->> 'email_in_coda')::integer = 1 from _r), 'email solo a chi ha il consenso');
select tests.expect((select count(*) from public.email_outbox where template = 'marketing') = 1, 'una sola email in coda');
select tests.expect((select payload ->> 'unsubscribe_path' like '/disiscriviti/%' from public.email_outbox where template = 'marketing'), 'link di disiscrizione nell''email');
select tests.expect((select count(*) from public.marketing_sends where message_id = tests.id('msg1') and status = 'escluso' and reason = 'nessun_consenso') >= 10, 'esclusioni registrate con il motivo');
select tests.expect((select count(*) from public.notifications where category = 'promozioni') >= 1, 'notifica in app separata (categoria Promozioni)');
select tests.expect_error($$select public.admin_send_marketing_message(tests.id('msg1'))$$, 'nessun secondo invio');
select tests.expect_error($$update public.marketing_messages set body = 'Testo cambiato dopo l''invio del messaggio' where id = tests.id('msg1')$$, 'messaggio inviato non modificabile');

-- Limite di frequenza
insert into public.marketing_messages (subject, body, channels, segment, status) values ('Secondo messaggio', 'Altro messaggio promozionale per verificare il limite.', '{email}', '{}', 'da_approvare');
select public.admin_approve_marketing_message((select id from public.marketing_messages where subject = 'Secondo messaggio'));
select public.admin_send_marketing_message((select id from public.marketing_messages where subject = 'Secondo messaggio'));
select tests.expect((select count(*) from public.marketing_sends s join public.marketing_messages m on m.id = s.message_id where m.subject = 'Secondo messaggio' and s.reason = 'limite_frequenza') = 1, 'limite di frequenza rispettato');

-- Disiscrizione con token, senza accesso
reset role;
create temp table _tok as select token from public.email_unsubscribe_tokens where user_id = '10000000-0000-0000-0000-000000000061';
grant select on _tok to anon;
select tests.as_anon();
select tests.expect(not public.marketing_unsubscribe('token-non-valido-xxxxxxxxxxxxxxxxxxxx'), 'token non valido');
select tests.expect(public.marketing_unsubscribe((select token from _tok)), 'disiscrizione con token');
reset role;
select tests.expect((select not marketing_consent from public.profiles where id = '10000000-0000-0000-0000-000000000061'), 'consenso revocato');
select tests.expect((select count(*) from public.marketing_consent_log where user_id = '10000000-0000-0000-0000-000000000061' and not consent and source = 'disiscrizione') = 1, 'revoca registrata');

-- Automazioni: spente; attivazione solo del fondatore; disattivazione immediata
select tests.as_user(tests.id('operatore'));
select tests.expect_error($$update public.marketing_workflows set active = true where key = 'garage_vuoto'$$, 'solo il fondatore attiva un''automazione');
reset role;
select tests.expect(private.run_marketing_workflows() = 0, 'interruttore generale spento: nessun invio');
select tests.as_user(tests.id('admin'));
select public.admin_set_setting('marketing_workflows_enabled', 'true');
update public.marketing_workflows set delay_days = 1 where key = 'garage_vuoto';
update public.marketing_workflows set active = true where key = 'garage_vuoto';
reset role;
update public.profiles set created_at = now() - interval '3 days' where id = tests.id('cliente2');
create temp table _wf as select private.run_marketing_workflows() n;
select tests.expect((select n >= 1 from _wf), 'automazione eseguita');
select tests.expect(private.run_marketing_workflows() = 0, 'una sola volta per persona (limite e intervallo)');
select tests.as_user(tests.id('admin'));
update public.marketing_workflows set title = 'Titolo modificato per la prova' where key = 'garage_vuoto';
select tests.expect((select not active from public.marketing_workflows where key = 'garage_vuoto'), 'modifica del testo: automazione da riattivare');
rollback;

select '=== TEST FASE 32 SUPERATI ===';

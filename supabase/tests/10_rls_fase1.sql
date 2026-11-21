-- =====================================================================
-- Test RLS e regole di sicurezza — Fase 1
-- Eseguito da scripts/test-db.sh su un database PostgreSQL temporaneo.
-- Ogni controllo stampa "OK — ..." oppure interrompe con "TEST FALLITO".
-- =====================================================================
\set ON_ERROR_STOP on

-- Utenti di prova (dati fittizi, solo per i test)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'cliente.a@test.local',
     '{"full_name":"Cliente A","requested_role":"cliente","accepted_terms":"true"}'),
  ('00000000-0000-0000-0000-00000000000b', 'cliente.b@test.local',
     '{"full_name":"Cliente B","requested_role":"cliente","accepted_terms":"true"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'officina@test.local',
     '{"full_name":"Mario Rossi","requested_role":"officina","business_name":"Officina Rossi & Figli","accepted_terms":"true"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'fondatore@test.local',
     '{"full_name":"Fondatore","requested_role":"cliente","accepted_terms":"true"}'),
  ('00000000-0000-0000-0000-0000000000ee', 'attaccante@test.local',
     '{"full_name":"Attaccante","requested_role":"admin"}');

-- ---------------------------------------------------------------------
-- 1. Trigger di registrazione
-- ---------------------------------------------------------------------
select tests.expect((select count(*) from public.profiles) = 5, 'profilo creato per ogni utente');
select tests.expect(
  (select role from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000ee') = 'cliente',
  'il ruolo "admin" richiesto in registrazione viene ignorato (assegnato "cliente")');
select tests.expect(
  (select terms_accepted_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000000ee'),
  'termini non accettati non vengono registrati come accettati');
select tests.expect(
  (select slug from public.professional_profiles where user_id = '00000000-0000-0000-0000-0000000000a1')
    = 'officina-rossi-figli-00000000',
  'profilo professionale creato con slug leggibile');
select tests.expect(
  not exists (select 1 from public.professional_profiles where user_id = '00000000-0000-0000-0000-00000000000a'),
  'nessun profilo professionale per i clienti');

-- ---------------------------------------------------------------------
-- 2. Cliente A: accesso ai soli propri dati
-- ---------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select tests.expect((select count(*) from public.profiles) = 1, 'il cliente vede solo il proprio profilo');
select tests.expect((select count(*) from public.user_roles) = 1, 'il cliente vede solo i propri ruoli');

update public.profiles set full_name = 'Cliente A Modificato', city = 'Milano'
 where id = '00000000-0000-0000-0000-00000000000a';
select tests.expect(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Cliente A Modificato',
  'il cliente modifica i propri dati');

select tests.expect_error(
  $$update public.profiles set account_status = 'attivo' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'il cliente non può cambiare il proprio stato account');
select tests.expect_error(
  $$update public.profiles set email = 'x@y.z' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'il cliente non può cambiare l''email del profilo direttamente');
select tests.expect_error(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin')$$,
  'il cliente non può assegnarsi ruoli');
select tests.expect_error(
  $$select public.admin_set_account_status('00000000-0000-0000-0000-00000000000b', 'sospeso', 'test')$$,
  'il cliente non può usare funzioni amministrative');
select tests.expect_error(
  $$select public.bootstrap_first_admin('cliente.a@test.local')$$,
  'il cliente non può auto-nominarsi primo amministratore');
select tests.expect_error(
  $$insert into public.admin_audit_logs (action) values ('falso.evento')$$,
  'il cliente non può scrivere nell''audit log');
select tests.expect_error(
  $$insert into public.verification_requests (user_id, verification_type) values ('00000000-0000-0000-0000-00000000000a', 'identita')$$,
  'un cliente senza profilo professionale non può chiedere badge');
rollback;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
with upd as (
  update public.profiles set full_name = 'Hackerato'
   where id = '00000000-0000-0000-0000-00000000000b' returning 1)
select tests.expect((select count(*) from upd) = 0, 'il cliente non può modificare il profilo di un altro');
rollback;

-- ---------------------------------------------------------------------
-- 3. Visitatore anonimo
-- ---------------------------------------------------------------------
begin;
set local role anon;
select tests.expect_error($$select * from public.profiles$$, 'l''anonimo non legge i profili privati');
select tests.expect_error($$select * from public.business_profiles$$, 'l''anonimo non legge i dati fiscali');
select tests.expect((select count(*) from public.professional_profiles) = 0,
  'i profili professionali non pubblicati sono invisibili');
select tests.expect_error(
  $$select public.admin_grant_role('00000000-0000-0000-0000-00000000000a', 'admin')$$,
  'l''anonimo non può eseguire funzioni amministrative');
rollback;

-- ---------------------------------------------------------------------
-- 4. Professionista: profilo pubblico e dati fiscali
-- ---------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select tests.expect_error(
  $$update public.professional_profiles set is_published = true where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  'non si pubblica un profilo senza città');
update public.professional_profiles set city = 'Milano', description = 'Officina meccanica', is_published = true
 where user_id = '00000000-0000-0000-0000-0000000000a1';
select tests.expect_error(
  $$update public.professional_profiles set identity_verified_at = now() where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  'il professionista non può assegnarsi badge di verifica');
select tests.expect_error(
  $$insert into public.business_profiles (user_id, legal_name, vat_number) values ('00000000-0000-0000-0000-0000000000a1', 'Officina Rossi Srl', '123')$$,
  'partita IVA italiana non valida rifiutata');
insert into public.business_profiles (user_id, legal_name, vat_number)
values ('00000000-0000-0000-0000-0000000000a1', 'Officina Rossi Srl', '12345678901');
insert into public.verification_requests (user_id, verification_type, user_notes)
values ('00000000-0000-0000-0000-0000000000a1', 'attivita_professionale', 'Visura camerale allegata');
select tests.expect_error(
  $$insert into public.verification_requests (user_id, verification_type) values ('00000000-0000-0000-0000-0000000000a1', 'attivita_professionale')$$,
  'una sola richiesta aperta per tipo di verifica');
select tests.expect_error(
  $$insert into public.verification_requests (user_id, verification_type, status) values ('00000000-0000-0000-0000-0000000000a1', 'identita', 'approvata')$$,
  'il professionista non può inviare una richiesta già approvata');
commit;

begin;
set local role anon;
select tests.expect((select count(*) from public.professional_profiles) = 0,
  'un profilo pubblicato ma non ancora approvato resta invisibile (Fase 5)');
rollback;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.expect((select count(*) from public.business_profiles) = 0,
  'un altro utente non vede i dati fiscali del professionista');
select tests.expect((select count(*) from public.verification_requests) = 0,
  'un altro utente non vede le richieste di verifica altrui');
rollback;

-- ---------------------------------------------------------------------
-- 5. Primo amministratore (solo service_role, una sola volta)
-- ---------------------------------------------------------------------
begin;
set local role service_role;
select public.bootstrap_first_admin('FONDATORE@test.local');
commit;

begin;
set local role service_role;
select tests.expect_error($$select public.bootstrap_first_admin('cliente.b@test.local')$$,
  'il bootstrap funziona una sola volta');
rollback;

-- ---------------------------------------------------------------------
-- 6. Amministratore: controllo completo e tracciato
-- ---------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';

select tests.expect((select count(*) from public.profiles) = 5, 'l''amministratore vede tutti i profili');
select tests.expect((select count(*) from public.business_profiles) = 1, 'l''amministratore vede i dati fiscali');

select public.admin_review_verification(
  (select id from public.verification_requests where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'approvata', 'Visura controllata il 19/11/2026');
select tests.expect(
  (select business_verified_at is not null and identity_verified_at is null
     from public.professional_profiles where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'l''approvazione attiva solo il badge corrispondente');

select public.admin_review_professional_profile(
  (select id from public.professional_profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'approvato', null);
set local role anon;
select tests.expect((select count(*) from public.professional_profiles) = 1,
  'dopo l''approvazione amministrativa il profilo è visibile ai visitatori');
set local role authenticated;
select public.admin_set_account_status('00000000-0000-0000-0000-0000000000a1', 'sospeso', 'Controllo segnalazione');
select tests.expect_error(
  $$select public.admin_set_account_status('00000000-0000-0000-0000-0000000000ad', 'sospeso', 'x')$$,
  'l''amministratore non può sospendere sé stesso');
select tests.expect_error(
  $$select public.admin_revoke_role('00000000-0000-0000-0000-0000000000ad', 'admin')$$,
  'l''amministratore non può revocarsi il ruolo');
select tests.expect((select count(*) from public.admin_audit_logs) >= 3,
  'le operazioni amministrative sono nell''audit log');
select tests.expect_error($$update public.admin_audit_logs set action = 'modificato'$$,
  'l''audit log non è modificabile');
commit;

begin;
set local role service_role;
select tests.expect_error($$delete from public.admin_audit_logs$$,
  'l''audit log non è cancellabile nemmeno con service_role');
rollback;

begin;
set local role anon;
select tests.expect((select count(*) from public.professional_profiles) = 0,
  'il profilo di un account sospeso sparisce dalle pagine pubbliche');
rollback;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
with upd as (
  update public.profiles set full_name = 'X' where id = '00000000-0000-0000-0000-0000000000a1' returning 1)
select tests.expect((select count(*) from upd) = 0, 'un account sospeso non può modificare il profilo');
select tests.expect(not private.has_role('officina'), 'un account sospeso perde i permessi di ruolo');
rollback;

-- ---------------------------------------------------------------------
-- 7. Storage: documenti privati
-- ---------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into storage.objects (bucket_id, name)
values ('verification-documents', '00000000-0000-0000-0000-00000000000a/documento.pdf');
select tests.expect_error(
  $$insert into storage.objects (bucket_id, name) values ('verification-documents', '00000000-0000-0000-0000-00000000000b/intruso.pdf')$$,
  'non si caricano file nella cartella di un altro utente');
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.expect((select count(*) from storage.objects where bucket_id = 'verification-documents') = 0,
  'un utente non vede i documenti privati altrui');
rollback;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select tests.expect((select count(*) from storage.objects where bucket_id = 'verification-documents') = 1,
  'l''amministratore può consultare i documenti di verifica');
rollback;

begin;
set local role anon;
select tests.expect((select count(*) from storage.objects) = 0, 'l''anonimo non vede documenti');
rollback;

\echo '=== TUTTI I TEST RLS DELLA FASE 1 SONO SUPERATI ==='

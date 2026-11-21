-- =====================================================================
-- Test di sicurezza e logica — Fasi 3–10
-- Ogni blocco simula un utente reale (ruoli anon/authenticated/service_role)
-- =====================================================================
\set ON_ERROR_STOP on

-- Valutazione neopatentati su un veicolo di prova (solo test).
create function tests.neo(_power numeric, _tare integer, _documented numeric, _fuel text, _rule text default '2024')
returns text language sql stable as $$
  select private.evaluate_neo(
    jsonb_populate_record(null::public.vehicles, jsonb_build_object('power_kw', _power, 'tare_kg', _tare,
      'power_to_tare_documented', _documented, 'fuel', _fuel, 'vehicle_category', 'M1')),
    (select params from public.legal_rule_versions where version_label like _rule || '%' and status = 'pubblicata' limit 1)) ->> 'result';
$$;
grant execute on function tests.neo(numeric, integer, numeric, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Utenti di prova
-- ---------------------------------------------------------------------
insert into tests.ids values
  ('cliente', '10000000-0000-0000-0000-000000000001'), ('cliente2', '10000000-0000-0000-0000-000000000002'),
  ('privato', '10000000-0000-0000-0000-000000000003'), ('dealer', '10000000-0000-0000-0000-000000000004'),
  ('officina', '10000000-0000-0000-0000-000000000005'), ('meccanico', '10000000-0000-0000-0000-000000000006'),
  ('ricambista', '10000000-0000-0000-0000-000000000007'), ('admin', '10000000-0000-0000-0000-000000000008'),
  ('moderatore', '10000000-0000-0000-0000-000000000009'), ('operatore', '10000000-0000-0000-0000-000000000010');

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@test.local', jsonb_build_object('full_name', initcap(name), 'accepted_terms', 'true',
  'requested_role', case name when 'dealer' then 'venditore_auto' when 'officina' then 'officina' when 'meccanico' then 'meccanico'
                              when 'ricambista' then 'venditore_ricambi' else 'cliente' end,
  'business_name', case name when 'dealer' then 'Auto Brera' when 'officina' then 'Officina Navigli' when 'meccanico' then 'Luca Meccanico'
                             when 'ricambista' then 'Ricambi Lambrate' end)
from tests.ids;

insert into tests.ids select 'pp_' || t.name, pp.id from tests.ids t join public.professional_profiles pp on pp.user_id = t.id;

-- Il bootstrap è già stato provato nei test di Fase 1: qui il fondatore viene configurato con la chiave di servizio.
begin; select tests.as_service();
insert into public.user_roles (user_id, role) values (tests.id('admin'), 'admin'), (tests.id('admin'), 'super_admin');
commit;

-- ---------------------------------------------------------------------
-- RBAC (Fase 10)
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('admin'));
select tests.expect(private.has_permission('roles.manage_admins'), 'il fondatore è super amministratore');
select public.admin_grant_role(tests.id('moderatore'), 'moderatore');
select public.admin_grant_role(tests.id('operatore'), 'operatore_assistenza');
select tests.expect_error($$select public.admin_grant_role(tests.id('admin'), 'moderatore')$$, 'nessuno modifica i propri privilegi');
commit;

begin;
select tests.as_user(tests.id('moderatore'));
select tests.expect(private.has_permission('listings.moderate') and not private.has_permission('roles.manage'),
  'il moderatore modera ma non gestisce i ruoli');
select tests.expect_error($$select public.admin_grant_role(tests.id('cliente'), 'admin')$$, 'il moderatore non può nominare amministratori');
rollback;

begin;
select tests.as_user(tests.id('operatore'));
select tests.expect(private.has_permission('support.manage') and not private.has_permission('listings.moderate'),
  'l''operatore assistenza gestisce solo assistenza e segnalazioni');
rollback;

-- ---------------------------------------------------------------------
-- Fase 3 — annunci auto
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('privato'));
insert into public.vehicles (id, owner_id, make_slug, make_name, model, version, year, mileage_km, fuel, transmission, power_kw, tare_kg, body_type)
values ('20000000-0000-0000-0000-000000000001', tests.id('privato'), 'fiat', 'Fiat', 'Panda', '1.0 Hybrid', 2021, 42000, 'ibrida', 'manuale', 51, 1015, 'utilitaria');
insert into public.vehicle_listings (id, vehicle_id, owner_id, title, price_cents, city, description)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', tests.id('privato'),
        'Fiat Panda 1.0 Hybrid', 1150000, 'Milano', 'Unico proprietario, tagliandi regolari.');
select tests.expect((select seller_kind from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'privato',
  'un cliente pubblica come venditore privato');
select tests.expect((select neo_result from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'compatibile',
  'verifica neopatentati calcolata alla creazione (51 kW, 1015 kg → compatibile)');
select tests.expect_error($$update public.vehicle_listings set status = 'in_revisione' where id = '30000000-0000-0000-0000-000000000001'$$,
  'non si invia in revisione un annuncio senza foto e dichiarazioni');
select tests.expect_error($$update public.vehicle_listings set status = 'pubblicato' where id = '30000000-0000-0000-0000-000000000001'$$,
  'il venditore non può pubblicare da solo');
select tests.expect_error($$insert into public.vehicle_images (listing_id, storage_path) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002/foto.jpg')$$,
  'le foto devono stare nella cartella del venditore');
insert into public.vehicle_images (listing_id, storage_path, is_cover)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003/panda-1.jpg', true);
update public.vehicle_listings set declared_accuracy_at = now(), declared_availability_at = now(), declared_right_to_publish_at = now(),
  declared_photo_rights_at = now(), accepted_terms_at = now() where id = '30000000-0000-0000-0000-000000000001';
update public.vehicle_listings set status = 'in_revisione' where id = '30000000-0000-0000-0000-000000000001';
select tests.expect((select status from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'in_revisione',
  'annuncio completo inviato in revisione');
commit;

begin;
select tests.as_anon();
select tests.expect((select count(*) from public.listing_search) = 0, 'gli annunci in revisione non sono pubblici');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
with u as (update public.vehicle_listings set price_cents = 1 where id = '30000000-0000-0000-0000-000000000001' returning 1)
select tests.expect((select count(*) from u) = 0, 'un utente non modifica gli annunci altrui');
select tests.expect_error($$select public.admin_moderate_listing('30000000-0000-0000-0000-000000000001', 'approva_pubblica')$$,
  'un cliente non modera gli annunci');
rollback;

begin;
select tests.as_user(tests.id('moderatore'));
select public.admin_moderate_listing('30000000-0000-0000-0000-000000000001', 'approva_pubblica', null);
commit;

begin;
select tests.as_anon();
select tests.expect((select count(*) from public.listing_search where make_slug = 'fiat' and model ilike 'panda%') = 1,
  'dopo l''approvazione l''annuncio è cercabile per marca e modello');
select tests.expect((select count(*) from public.vehicle_images) = 1, 'le foto dell''annuncio pubblicato sono visibili');
select tests.expect_error($$select * from public.vehicle_listing_status_history$$, 'lo storico stati non è pubblico');
select tests.expect((select (public.evaluate_listing_neo(slug) ->> 'result') from public.vehicle_listings limit 1) = 'compatibile',
  'la scheda mostra la verifica neopatentati');
rollback;

begin;
select tests.as_user(tests.id('privato'));
update public.vehicle_listings set description = 'Descrizione modificata con nuovi dettagli.' where id = '30000000-0000-0000-0000-000000000001';
select tests.expect((select status from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'in_revisione',
  'una modifica sostanziale riporta l''annuncio in revisione');
rollback;

begin;
select tests.as_user(tests.id('privato'));
update public.vehicle_listings set price_cents = 1090000 where id = '30000000-0000-0000-0000-000000000001';
select tests.expect((select status from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'pubblicato',
  'l''aggiornamento del prezzo non richiede nuova revisione');
update public.vehicle_listings set status = 'sospeso' where id = '30000000-0000-0000-0000-000000000001';
update public.vehicle_listings set status = 'pubblicato' where id = '30000000-0000-0000-0000-000000000001';
select tests.expect((select status from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000001') = 'pubblicato',
  'il venditore sospende e riattiva il proprio annuncio');
rollback;

begin;
select tests.as_user(tests.id('privato'));
insert into public.vehicles (id, owner_id, make_slug, make_name, model) values
  ('20000000-0000-0000-0000-000000000002', tests.id('privato'), 'kia', 'Kia', 'Picanto'),
  ('20000000-0000-0000-0000-000000000003', tests.id('privato'), 'kia', 'Kia', 'Rio'),
  ('20000000-0000-0000-0000-000000000004', tests.id('privato'), 'kia', 'Kia', 'Ceed');
insert into public.vehicle_listings (vehicle_id, owner_id, title) values
  ('20000000-0000-0000-0000-000000000002', tests.id('privato'), 'Kia Picanto'),
  ('20000000-0000-0000-0000-000000000003', tests.id('privato'), 'Kia Rio');
select tests.expect_error($$insert into public.vehicle_listings (vehicle_id, owner_id, title) values ('20000000-0000-0000-0000-000000000004', tests.id('privato'), 'Kia Ceed')$$,
  'un privato ha al massimo 3 annunci attivi');
rollback;

begin;
select tests.as_user(tests.id('dealer'));
insert into public.vehicles (id, owner_id, make_slug, make_name, model, year, mileage_km, fuel, transmission, power_kw, body_type)
values ('20000000-0000-0000-0000-000000000010', tests.id('dealer'), 'bmw', 'BMW', 'Serie 1', 2022, 18000, 'benzina', 'automatico', 115, 'berlina');
insert into public.vehicle_listings (id, vehicle_id, owner_id, title, price_cents, city)
values ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', tests.id('dealer'), 'BMW 118i', 2490000, 'Milano');
select tests.expect((select seller_kind = 'professionista' and professional_profile_id is not null from public.vehicle_listings
                     where id = '30000000-0000-0000-0000-000000000010'), 'il concessionario pubblica come professionista');
select tests.expect((select neo_result from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000010') = 'non_compatibile',
  '115 kW supera il limite di 105 kW: non compatibile anche senza tara');
commit;

-- Field Manager: annuncio raccolto sul territorio
begin;
select tests.as_user(tests.id('moderatore'));
select tests.expect_error($$insert into public.vehicles (id, owner_id, make_slug, make_name, model) values ('20000000-0000-0000-0000-000000000020', tests.id('moderatore'), 'opel', 'Opel', 'Corsa');
  insert into public.vehicle_listings (vehicle_id, owner_id, title, source) values ('20000000-0000-0000-0000-000000000020', tests.id('moderatore'), 'Opel Corsa', 'field_manager')$$,
  'solo chi ha il permesso Field Manager crea annunci raccolti sul territorio');
rollback;

begin;
select tests.as_user(tests.id('admin'));
insert into public.field_contacts (id, business_name, business_type, city, status)
values ('40000000-0000-0000-0000-000000000001', 'Concessionaria Sempione', 'concessionario', 'Milano', 'contattato');
insert into public.vehicles (id, owner_id, make_slug, make_name, model, year, mileage_km, fuel, transmission, power_kw, tare_kg)
values ('20000000-0000-0000-0000-000000000021', tests.id('admin'), 'toyota', 'Toyota', 'Yaris', 2020, 61000, 'ibrida', 'automatico', 85, 1085);
insert into public.vehicle_listings (id, vehicle_id, owner_id, title, price_cents, city, description, source, field_contact_id,
  declared_accuracy_at, declared_availability_at, declared_right_to_publish_at, declared_photo_rights_at, accepted_terms_at)
values ('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', tests.id('admin'), 'Toyota Yaris Hybrid', 1390000,
  'Milano', 'Raccolta durante la visita del 19/11.', 'field_manager', '40000000-0000-0000-0000-000000000001', now(), now(), now(), now(), now());
insert into public.vehicle_images (listing_id, storage_path) values ('30000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000008/yaris.jpg');
select tests.expect_error($$update public.vehicle_listings set status = 'in_revisione' where id = '30000000-0000-0000-0000-000000000021'$$,
  'senza autorizzazione del venditore l''annuncio raccolto non va in revisione');
insert into public.seller_authorizations (listing_id, contact_id, authorized_by_name, authorized_on, method, scope, listing_authorized, photos_authorized)
values ('30000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000001', 'Mario Bianchi', current_date, 'modulo_firmato',
        'Pubblicazione annuncio e fotografie su AutoGarage24', true, true);
update public.vehicle_listings set status = 'in_revisione' where id = '30000000-0000-0000-0000-000000000021';
select public.admin_moderate_listing('30000000-0000-0000-0000-000000000021', 'approva_pubblica', 'Dati verificati con il venditore');
select tests.expect((select status from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000021') = 'pubblicato',
  'con autorizzazione documentata l''annuncio raccolto viene pubblicato');
commit;

-- ---------------------------------------------------------------------
-- Preferiti
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
insert into public.favorites (user_id, listing_id) values (tests.id('cliente'), '30000000-0000-0000-0000-000000000001');
select tests.expect_error($$insert into public.favorites (user_id, listing_id) values (tests.id('cliente'), '30000000-0000-0000-0000-000000000001')$$,
  'nessun preferito duplicato');
select tests.expect_error($$insert into public.favorites (user_id, listing_id) values (tests.id('cliente2'), '30000000-0000-0000-0000-000000000001')$$,
  'non si salvano preferiti per conto di altri');
commit;
begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.favorites) = 0, 'i preferiti sono privati');
rollback;

-- ---------------------------------------------------------------------
-- Richieste, conversazioni e messaggi
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
insert into public.requests (id, kind, requester_id, listing_id, subject, message)
values ('50000000-0000-0000-0000-000000000001', 'info_auto', tests.id('cliente'), '30000000-0000-0000-0000-000000000001',
        'Fiat Panda 1.0 Hybrid', 'Buongiorno, sono interessato a questa automobile. È ancora disponibile?');
select tests.expect((select recipient_id from public.requests where id = '50000000-0000-0000-0000-000000000001') = tests.id('privato'),
  'la richiesta arriva al venditore corretto (destinatario ricavato dal sistema)');
select tests.expect((select count(*) from public.conversation_participants cp join public.requests r on r.conversation_id = cp.conversation_id
                     where r.id = '50000000-0000-0000-0000-000000000001') = 2, 'creata la conversazione collegata all''annuncio');
select tests.expect_error($$insert into public.requests (kind, requester_id, listing_id, subject, message) values ('info_auto', tests.id('cliente'), '30000000-0000-0000-0000-000000000001', 'Doppia', 'Messaggio duplicato di prova')$$,
  'nessuna richiesta duplicata per lo stesso annuncio');
select tests.expect_error($$insert into public.requests (kind, requester_id, recipient_id, listing_id, subject, message) values ('appuntamento_auto', tests.id('cliente'), tests.id('cliente2'), '30000000-0000-0000-0000-000000000001', 'Visita', 'Vorrei vedere l''auto')$$,
  'appuntamento per vedere l''auto: la data è obbligatoria');
insert into public.messages (conversation_id, sender_id, body)
select conversation_id, tests.id('cliente'), 'Posso passare sabato?' from public.requests where id = '50000000-0000-0000-0000-000000000001';
insert into tests.ids select 'conv1', conversation_id from public.requests where id = '50000000-0000-0000-0000-000000000001';
commit;

begin;
select tests.as_user(tests.id('privato'));
select tests.expect((select count(*) from public.notifications where category = 'automobili') >= 1, 'il venditore riceve la notifica');
select tests.expect((select count(*) from public.messages) = 2, 'il venditore legge la conversazione (richiesta + messaggio)');
select tests.expect_error($$select public.update_request_status('50000000-0000-0000-0000-000000000001', 'rifiutata', null)$$,
  'il rifiuto richiede una motivazione');
select public.update_request_status('50000000-0000-0000-0000-000000000001', 'risposta_inviata', null);
commit;

begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.requests) = 0, 'un altro utente non vede le richieste altrui');
select tests.expect((select count(*) from public.conversations) = 0, 'un altro utente non vede le conversazioni altrui');
select tests.expect((select count(*) from public.messages) = 0, 'un altro utente non legge i messaggi altrui (anche conoscendo l''ID)');
select tests.expect_error($$insert into public.messages (conversation_id, sender_id, body) values ((select conversation_id from public.requests where id = '50000000-0000-0000-0000-000000000001'), tests.id('cliente2'), 'intrusione')$$,
  'un estraneo non scrive nella conversazione');
select tests.expect_error($$select public.update_request_status('50000000-0000-0000-0000-000000000001', 'annullata', null)$$,
  'un estraneo non modifica la richiesta');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.update_request_status('50000000-0000-0000-0000-000000000001', 'completata', null)$$,
  'il cliente non può segnare la richiesta come completata');
rollback;

-- Limite anti-spam sui messaggi
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($q$do $x$ begin for i in 1..25 loop insert into public.messages (conversation_id, sender_id, body)
  select conversation_id, tests.id('cliente'), 'spam ' || i from public.requests where id = '50000000-0000-0000-0000-000000000001'; end loop; end $x$$q$,
  'più di 20 messaggi al minuto vengono bloccati');
rollback;

-- Accesso dello staff alle conversazioni
begin;
select tests.as_user(tests.id('moderatore'));
select tests.expect_error($$select public.admin_read_conversation((select conversation_id from public.requests limit 1), 'controllo segnalazione n. 12')$$,
  'il moderatore non legge le conversazioni private');
rollback;
begin;
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_read_conversation('00000000-0000-0000-0000-000000000000', 'x')$$,
  'la lettura amministrativa richiede una motivazione');
select tests.expect(jsonb_array_length(public.admin_read_conversation(
  (select conversation_id from public.requests where id = '50000000-0000-0000-0000-000000000001'),
  'Verifica della segnalazione n. 12 su tentativo di truffa')) >= 2, 'con motivazione l''accesso è consentito');
select tests.expect(exists (select 1 from public.admin_audit_logs where action = 'conversation.read'), 'e viene registrato nell''audit log');
commit;

-- ---------------------------------------------------------------------
-- Fasi 5–6 — officine: revisione, servizi, preventivi, appuntamenti, recensioni
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$insert into public.requests (kind, requester_id, professional_profile_id, subject, message) values ('preventivo', tests.id('cliente'), tests.id('pp_officina'), 'Tagliando', 'Vorrei un preventivo per il tagliando')$$,
  'non si inviano richieste a profili non approvati');
rollback;

begin;
select tests.as_user(tests.id('officina'));
select tests.expect_error($$select public.submit_professional_profile()$$, 'il profilo incompleto non si invia');
update public.professional_profiles set city = 'Milano', description = 'Officina meccanica e tagliandi.', categories = '{officina-meccanica,centro-tagliandi}',
  is_published = true, accepts_appointments = true, latitude = 45.452, longitude = 9.176
 where user_id = tests.id('officina');
select tests.expect_error($$update public.professional_profiles set review_status = 'approvato' where user_id = tests.id('officina')$$,
  'il professionista non può approvarsi da solo');
select public.submit_professional_profile();
insert into public.professional_services (id, profile_id, name, category, price_type)
select '60000000-0000-0000-0000-000000000001', id, 'Tagliando completo', 'centro-tagliandi', 'su_preventivo' from public.professional_profiles where user_id = tests.id('officina');
select tests.expect_error($$insert into public.professional_services (profile_id, name, price_type, price_cents) select id, 'Prezzo inventato', 'su_preventivo', 9900 from public.professional_profiles where user_id = tests.id('officina')$$,
  'un servizio "su preventivo" non può avere un prezzo');
commit;

begin;
select tests.as_user(tests.id('meccanico'));
select tests.expect_error($$insert into public.professional_services (profile_id, name) values (tests.id('pp_officina'), 'Servizio altrui')$$,
  'un professionista non gestisce i servizi di un altro');
rollback;

begin;
select tests.as_user(tests.id('admin'));
select public.admin_review_professional_profile((select id from public.professional_profiles where user_id = tests.id('officina')), 'approvato', null);
commit;

begin;
select tests.as_anon();
select tests.expect((select count(*) from public.search_professionals('officina', null, 'milano')) = 1, 'la ricerca restituisce l''officina approvata');
select tests.expect((select count(*) from public.search_professionals('officina', p_category => 'centro-tagliandi')) = 1, 'filtro per servizio');
select tests.expect((select count(*) from public.search_professionals('officina', p_lat => 45.46, p_lng => 9.19, p_radius_km => 5)) = 1,
  'ricerca per raggio sui profili con coordinate');
select tests.expect((select count(*) from public.search_professionals('officina', p_verified_only => true)) = 0,
  'nessun badge di verifica attribuito automaticamente');
select tests.expect_error($$select * from public.business_profiles$$, 'i dati fiscali restano privati');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
insert into public.requests (id, kind, requester_id, professional_profile_id, service_id, subject, message, vehicle_make, vehicle_model, vehicle_year)
select '50000000-0000-0000-0000-000000000002', 'preventivo', tests.id('cliente'), id, '60000000-0000-0000-0000-000000000001',
       'Tagliando Fiat Panda', 'Vorrei un preventivo per il tagliando dei 45.000 km', 'Fiat', 'Panda', 2021
  from public.professional_profiles where user_id = tests.id('officina');
commit;

begin;
select tests.as_user(tests.id('officina'));
select public.send_quote('50000000-0000-0000-0000-000000000002', 18000, 'Tagliando con olio e filtri', null, 'Olio 5W30, filtro olio, filtro aria', '2 ore');
select tests.expect((select status from public.requests where id = '50000000-0000-0000-0000-000000000002') = 'preventivo_inviato', 'preventivo inviato');
select tests.expect_error($$select public.respond_quote((select id from public.quotes limit 1), true)$$, 'l''officina non accetta il proprio preventivo');
commit;

begin;
select tests.as_user(tests.id('cliente'));
select public.respond_quote((select id from public.quotes where request_id = '50000000-0000-0000-0000-000000000002' and status = 'inviato'), true, null);
select tests.expect((select status from public.requests where id = '50000000-0000-0000-0000-000000000002') = 'accettata', 'preventivo accettato dal cliente');
select public.propose_appointment('50000000-0000-0000-0000-000000000002', current_date + 7, 'mattina', '9:00', null);
select tests.expect_error($$select public.respond_appointment((select id from public.appointments where status = 'in_attesa' limit 1), 'conferma')$$,
  'chi propone non può confermare il proprio appuntamento');
commit;

begin;
select tests.as_user(tests.id('officina'));
select public.respond_appointment((select id from public.appointments where request_id = '50000000-0000-0000-0000-000000000002' and status = 'in_attesa'), 'conferma');
select tests.expect((select status from public.appointments where request_id = '50000000-0000-0000-0000-000000000002' order by created_at desc limit 1) = 'confermato',
  'appuntamento confermato solo dopo l''accettazione dell''officina');
commit;

begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment) select professional_profile_id, tests.id('cliente'), id, 5, 'Ottimo lavoro, puntuali.' from public.requests where id = '50000000-0000-0000-0000-000000000002'$$,
  'nessuna recensione prima del completamento dell''intervento');
rollback;

begin;
select tests.as_user(tests.id('officina'));
select public.update_request_status('50000000-0000-0000-0000-000000000002', 'completata', null);
select public.propose_work_report('50000000-0000-0000-0000-000000000002', current_date, 'tagliando', 'Tagliando 45.000 km', 'Sostituiti olio e filtri', 45100, 'Olio 5W30', 18000);
commit;

begin;
select tests.as_user(tests.id('cliente'));
insert into public.reviews (profile_id, author_id, request_id, rating, title, comment, quality_rating, professionalism_rating, value_rating)
select professional_profile_id, tests.id('cliente'), id, 5, 'Consigliata', 'Ottimo lavoro, puntuali e trasparenti.', 5, 5, 4 from public.requests where id = '50000000-0000-0000-0000-000000000002';
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment) select professional_profile_id, tests.id('cliente'), id, 1, 'Seconda recensione sulla stessa richiesta' from public.requests where id = '50000000-0000-0000-0000-000000000002'$$,
  'una sola recensione per intervento');
commit;

begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment) values (tests.id('pp_officina'), tests.id('cliente2'), '50000000-0000-0000-0000-000000000002', 1, 'Recensione falsa senza intervento')$$,
  'chi non ha ricevuto l''intervento non può recensire');
rollback;

begin;
select tests.as_user(tests.id('officina'));
select tests.expect_error($$update public.reviews set rating = 1$$, 'l''officina non modifica le recensioni');
select public.reply_to_review((select id from public.reviews limit 1), 'Grazie per la fiducia!');
commit;

begin;
select tests.as_user(tests.id('admin'));
select tests.expect_error($$update public.reviews set comment = 'Testo modificato dallo staff'$$, 'nemmeno lo staff modifica il testo di una recensione');
rollback;

begin;
select tests.as_user(tests.id('moderatore'));
select public.admin_moderate_review((select id from public.reviews limit 1), 'nascosta', 'Verifica in corso su segnalazione');
select public.admin_moderate_review((select id from public.reviews limit 1), 'pubblicata', 'Segnalazione respinta');
commit;

-- Sovrapposizione appuntamenti
begin;
select tests.as_user(tests.id('cliente2'));
insert into public.requests (id, kind, requester_id, professional_profile_id, subject, message, preferred_date, preferred_slot)
select '50000000-0000-0000-0000-000000000003', 'appuntamento', tests.id('cliente2'), id, 'Controllo freni', 'Rumore in frenata', current_date + 7, 'mattina'
  from public.professional_profiles where user_id = tests.id('officina');
select public.propose_appointment('50000000-0000-0000-0000-000000000003', current_date + 7, 'mattina', null, null);
commit;
begin;
select tests.as_user(tests.id('officina'));
select tests.expect_error($$select public.respond_appointment((select id from public.appointments where request_id = '50000000-0000-0000-0000-000000000003'), 'conferma')$$,
  'nessuna sovrapposizione con un appuntamento già confermato');
rollback;

-- Collegamento meccanico ↔ officina
begin;
select tests.as_user(tests.id('meccanico'));
insert into public.professional_affiliations (mechanic_profile_id, garage_profile_id)
select m.id, g.id from public.professional_profiles m, public.professional_profiles g
 where m.user_id = tests.id('meccanico') and g.user_id = tests.id('officina');
select tests.expect_error($$select public.decide_affiliation((select id from public.professional_affiliations limit 1), 'accettato')$$,
  'il meccanico non può autorizzare da solo il collegamento');
commit;
begin;
select tests.as_user(tests.id('officina'));
select public.decide_affiliation((select id from public.professional_affiliations limit 1), 'accettato');
commit;

-- ---------------------------------------------------------------------
-- Fase 4 — motore neopatentati
-- ---------------------------------------------------------------------
begin;
select tests.expect((select version_label from private.current_neo_rule_version()) like '2024%', 'regola in vigore: L. 177/2024');
select tests.expect(tests.neo(70, 1100, null, 'benzina') = 'compatibile', '70 kW / 1100 kg = 63,6 kW/t → compatibile');
select tests.expect(tests.neo(70, null, null, 'benzina') = 'da_verificare', 'tara mancante → da verificare (mai compatibile per default)');
select tests.expect(tests.neo(null, 1100, null, 'benzina') = 'da_verificare', 'potenza mancante → da verificare');
select tests.expect(tests.neo(82, 1100, null, 'benzina') = 'da_verificare', '74,5 kW/t calcolato, vicino al limite → da verificare');
select tests.expect(tests.neo(82, 1100, 74.5, 'benzina') = 'compatibile', 'stesso valore ma documentato in carta di circolazione → compatibile');
select tests.expect(tests.neo(60, 1500, null, 'elettrica') = 'da_verificare', 'elettrica senza rapporto documentato → da verificare');
select tests.expect(tests.neo(100, 1200, null, 'benzina') = 'non_compatibile', '100 kW / 1200 kg = 83 kW/t → non compatibile');
select tests.expect(tests.neo(110, null, null, 'diesel') = 'non_compatibile', '110 kW supera 105 kW → non compatibile anche senza tara');
select tests.expect(tests.neo(105, 1500, null, 'benzina') = 'compatibile', '105 kW esatti (70 kW/t) → compatibile: il limite è "superiore a"');
select tests.expect(tests.neo(51, 1015, null, 'benzina', '2011') = 'compatibile' and tests.neo(70, 1100, null, 'benzina', '2011') = 'non_compatibile',
  'stesso veicolo, regole diverse: con le regole 2011 (55 kW/t) 63,6 kW/t non è compatibile');
rollback;

begin;
select tests.as_user(tests.id('moderatore'));
select tests.expect_error($$insert into public.legal_rule_versions (rule_id, version_label, effective_from, params, created_by) select id, 'test', current_date, '{}', tests.id('moderatore') from public.legal_rules$$,
  'solo gli amministratori autorizzati gestiscono le regole');
rollback;

begin;
select tests.as_user(tests.id('admin'));
insert into public.legal_rule_versions (id, rule_id, version_label, effective_from, license_obtained_from, params, created_by)
select '70000000-0000-0000-0000-000000000001', id, '2027 — bozza di prova', current_date, date '2024-12-14',
  '{"duration_months":36,"max_power_to_tare_kw_t":70,"max_power_kw":105,"borderline_margin_pct":2}', tests.id('admin') from public.legal_rules;
select tests.expect_error($$select public.admin_publish_rule_version('70000000-0000-0000-0000-000000000001', 'prova')$$, 'non si pubblica una regola senza test');
select public.admin_test_rule_version('70000000-0000-0000-0000-000000000001');
select tests.expect_error($$select public.admin_publish_rule_version('70000000-0000-0000-0000-000000000001', 'prova')$$, 'non si pubblica una regola senza fonti ufficiali');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
insert into public.driver_profiles (user_id, license_obtained_on, budget_max_cents) values (tests.id('cliente'), '2025-06-01', 1200000);
commit;
begin;
select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.driver_profiles) = 0, 'il profilo neopatentato non è visibile nemmeno allo staff');
rollback;

-- ---------------------------------------------------------------------
-- Fase 7 — ricambi
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('ricambista'));
select tests.expect_error($$insert into public.part_listings (owner_id, title, category_id, condition) select tests.id('ricambista'), 'Alternatore', id, 'ricondizionato' from public.part_categories where slug = 'elettronica'$$,
  'un ricambio ricondizionato richiede la descrizione del processo');
insert into public.part_listings (id, owner_id, title, category_id, manufacturer_brand, oem_code, description, condition, price_cents, city,
  declared_accuracy_at, declared_photo_rights_at, accepted_terms_at)
select '80000000-0000-0000-0000-000000000001', tests.id('ricambista'), 'Pastiglie freno anteriori', id, 'Brembo', '77 36 55 55', 'Kit pastiglie anteriori nuove',
       'nuovo', 3900, 'Milano', now(), now(), now() from public.part_categories where slug = 'pastiglie-freno';
select tests.expect_error($$update public.part_listings set status = 'in_revisione' where id = '80000000-0000-0000-0000-000000000001'$$,
  'ricambio senza foto non va in revisione');
insert into public.part_images (part_id, storage_path) values ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007/pastiglie.jpg');
insert into public.part_compatibility (part_id, make_slug, model, year_from, year_to, engine_code, oem_reference, basis)
values ('80000000-0000-0000-0000-000000000001', 'fiat', 'Panda', 2012, 2023, '312A2000', '77365555', 'codice_oem');
update public.part_listings set status = 'in_revisione' where id = '80000000-0000-0000-0000-000000000001';
select tests.expect((select seller_kind from public.part_listings where id = '80000000-0000-0000-0000-000000000001') = 'professionista',
  'il venditore di ricambi è professionista');
commit;

begin;
select tests.as_user(tests.id('moderatore'));
select public.admin_moderate_part('80000000-0000-0000-0000-000000000001', 'approva_pubblica', null);
commit;

begin;
select tests.as_anon();
select tests.expect((select count(*) from public.part_search where oem_code_norm = '77365555') = 1, 'ricerca per codice OEM normalizzato');
select tests.expect((select count(*) from public.part_compatibility) = 1, 'la compatibilità dichiarata è pubblica');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
insert into public.requests (kind, requester_id, part_id, subject, message)
values ('info_ricambio', tests.id('cliente'), '80000000-0000-0000-0000-000000000001', 'Pastiglie freno', 'Sono compatibili con la mia Panda 2021?');
select tests.expect((select recipient_id from public.requests where part_id is not null) = tests.id('ricambista'), 'la richiesta arriva al ricambista');
commit;

-- ---------------------------------------------------------------------
-- Fase 8 — garage virtuale e manutenzione
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
insert into public.user_vehicles (id, owner_id, make, model, year, plate, vin, current_mileage_km, is_primary)
values ('90000000-0000-0000-0000-000000000001', tests.id('cliente'), 'Fiat', 'Panda', 2021, 'GA123BC', 'ZFA31200000123456', 40000, true);
insert into public.mileage_logs (user_vehicle_id, value_km, recorded_on) values ('90000000-0000-0000-0000-000000000001', 50000, current_date - 10);
insert into public.mileage_logs (user_vehicle_id, value_km, recorded_on) values ('90000000-0000-0000-0000-000000000001', 45000, current_date);
select tests.expect((select is_inconsistent from public.mileage_logs where value_km = 45000), 'una diminuzione dei km viene segnalata');
select tests.expect((select current_mileage_km from public.user_vehicles where id = '90000000-0000-0000-0000-000000000001') = 50000,
  'il dato incoerente non viene applicato automaticamente');
insert into public.maintenance_records (id, user_vehicle_id, owner_id, title, category, performed_on, source)
values ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', tests.id('cliente'), 'Cambio gomme', 'pneumatici', current_date, 'professionista');
select tests.expect((select source from public.maintenance_records where id = '91000000-0000-0000-0000-000000000001') = 'manuale',
  'un intervento inserito dall''utente resta "manuale"');
select public.decide_work_report((select id from public.work_reports limit 1), true, null, '90000000-0000-0000-0000-000000000001');
select tests.expect((select count(*) from public.maintenance_records where source = 'professionista') = 1,
  'il rapporto dell''officina entra nello storico solo dopo la conferma del proprietario');
select tests.expect_error($$update public.maintenance_records set cost_cents = 1 where source = 'professionista'$$,
  'l''intervento certificato dal professionista non è modificabile');
insert into public.maintenance_reminders (owner_id, user_vehicle_id, title, category, due_date)
values (tests.id('cliente'), '90000000-0000-0000-0000-000000000001', 'Revisione', 'revisione', current_date - 1);
commit;

begin;
select tests.expect(private.process_reminders() = 1, 'il job dei promemoria invia la notifica di scadenza');
select tests.expect(private.process_reminders() = 0, 'eseguito di nuovo, non crea duplicati');
select tests.expect((select count(*) from public.notifications where category = 'manutenzione' and title like 'Scadenza superata%') = 1,
  'una sola notifica per la stessa scadenza');
commit;

begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.user_vehicles) = 0, 'targa e VIN non sono visibili ad altri utenti');
select tests.expect((select count(*) from public.maintenance_records) = 0, 'lo storico manutenzione è privato');
rollback;

begin;
select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.user_vehicles) = 0, 'lo staff non accede ai garage degli utenti');
rollback;

begin;
select tests.as_user(tests.id('officina'));
select tests.expect((public.request_vehicle_info('50000000-0000-0000-0000-000000000002')) is null, 'senza auto collegata nessun dato veicolo');
select tests.expect((select count(*) from public.user_vehicles) = 0, 'il professionista non vede targa e VIN del cliente');
rollback;

-- ---------------------------------------------------------------------
-- Fase 9–10 — assistenza, segnalazioni, CMS, GDPR, statistiche, storage
-- ---------------------------------------------------------------------
begin;
select tests.as_user(tests.id('cliente'));
select public.open_support_ticket('account', 'Non ricevo le email', 'Da ieri non ricevo le email di notifica.');
insert into public.content_reports (reporter_id, target_type, target_id, category, description)
values (tests.id('cliente'), 'annuncio_auto', '30000000-0000-0000-0000-000000000010', 'truffa', 'Prezzo sospetto e richiesta di anticipo.');
select tests.expect((select priority from public.content_reports limit 1) = 'alta', 'le segnalazioni di truffa hanno priorità alta');
commit;

begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.support_tickets) + (select count(*) from public.content_reports) = 0,
  'ticket e segnalazioni sono privati');
rollback;

begin;
select tests.as_user(tests.id('operatore'));
select public.admin_update_ticket((select id from public.support_tickets limit 1), 'in_lavorazione', true);
select tests.expect((select count(*) from public.messages) = 1, 'l''operatore che prende in carico il ticket legge la conversazione di assistenza');
select tests.expect_error($$select public.admin_update_report((select id from public.content_reports limit 1), 'risolta')$$,
  'chiudere una segnalazione richiede la descrizione della decisione');
select public.admin_update_report((select id from public.content_reports limit 1), 'in_esame', null, null, true);
commit;

begin;
select tests.as_user(tests.id('dealer'));
select tests.expect((select account_status from public.profiles where id = tests.id('dealer')) = 'attivo',
  'una segnalazione non sospende automaticamente l''utente');
rollback;

begin;
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_save_content('home.hero', '{"title":"<script>alert(1)</script>"}', true)$$, 'il CMS rifiuta HTML e script');
select public.admin_save_content('home.hero', '{"title":"Tutto il mondo dell''automobile."}', true);
select tests.expect((select (public.admin_dashboard_stats(30) ->> 'listings_published')::int) >= 1, 'statistiche reali per l''amministratore');
commit;

begin;
select tests.as_anon();
select tests.expect((select published ->> 'title' from public.site_content where key = 'home.hero') = 'Tutto il mondo dell''automobile.',
  'il contenuto pubblicato è visibile sul sito');
select tests.expect_error($$select public.export_my_data()$$, 'l''esportazione dati richiede l''accesso');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.admin_dashboard_stats(30)$$, 'un cliente non vede le statistiche');
select tests.expect((public.export_my_data() -> 'profilo' ->> 'id')::uuid = tests.id('cliente'), 'esportazione dei propri dati');
select tests.expect(jsonb_array_length(public.export_my_data() -> 'garage') = 1, 'l''esportazione include il garage virtuale');
insert into public.account_deletion_requests (user_id, reason) values (tests.id('cliente'), 'Non uso più il servizio');
select tests.expect_error($$insert into public.account_deletion_requests (user_id) values (tests.id('cliente'))$$, 'una sola richiesta di cancellazione aperta');
commit;

begin;
select tests.as_user(tests.id('cliente'));
insert into storage.objects (bucket_id, name) select 'message-attachments', conversation_id || '/foto-guasto.jpg' from public.requests where id = '50000000-0000-0000-0000-000000000001';
insert into storage.objects (bucket_id, name) values ('vehicle-documents', '10000000-0000-0000-0000-000000000001/fattura.pdf');
commit;
begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from storage.objects where bucket_id in ('message-attachments', 'vehicle-documents')) = 0,
  'allegati e documenti privati non accessibili ad altri utenti');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('message-attachments', tests.id('conv1') || '/x.pdf')$$,
  'non si caricano allegati in conversazioni altrui');
rollback;
begin;
select tests.as_user(tests.id('privato'));
select tests.expect((select count(*) from storage.objects where bucket_id = 'message-attachments') = 1, 'l''altro partecipante vede l''allegato');
select tests.expect((select count(*) from storage.objects where bucket_id = 'vehicle-documents') = 0, 'ma non i documenti personali del cliente');
rollback;

begin;
select tests.as_user(tests.id('dealer'));
select tests.expect((select count(*) from public.activity_events) = 0, 'il centro attività mostra solo i propri eventi');
rollback;
begin;
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.activity_events where event_type = 'appointment.confirmed') = 1, 'cronologia attività del professionista');
rollback;

\echo '=== TUTTI I TEST DELLE FASI 3–10 SONO SUPERATI ==='

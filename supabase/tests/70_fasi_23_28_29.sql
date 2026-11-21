-- =====================================================================
-- Test migrazione 0021 (Fasi 23, 28, 29): soccorso stradale e trasporto auto.
-- =====================================================================
\set ON_ERROR_STOP on

-- Operatori di prova: un soccorritore e un trasportatore registrati come professionisti.
insert into tests.ids values ('soccorso', '10000000-0000-0000-0000-000000000021'), ('trasporto', '10000000-0000-0000-0000-000000000022'),
  ('soccorso2', '10000000-0000-0000-0000-000000000023');
insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@test.local', jsonb_build_object('full_name', initcap(name), 'accepted_terms', 'true',
  'requested_role', case name when 'trasporto' then 'trasportatore' else 'soccorritore' end,
  'business_name', case name when 'soccorso' then 'Soccorso Navigli' when 'soccorso2' then 'Carro Attrezzi Bovisa' else 'Trasporti Lambro' end)
from tests.ids where name in ('soccorso', 'trasporto', 'soccorso2');
insert into tests.ids select 'pp_' || t.name, pp.id from tests.ids t join public.professional_profiles pp on pp.user_id = t.id where t.name in ('soccorso', 'trasporto', 'soccorso2');

begin;
reset role;
set local session_replication_role = replica;
update public.professional_profiles set is_published = true, review_status = 'approvato', city = 'Milano', region = 'Lombardia',
  latitude = 45.45, longitude = 9.18, service_radius_km = 30
 where id in (tests.id('pp_soccorso'), tests.id('pp_trasporto'), tests.id('pp_soccorso2'));
update public.professional_profiles set latitude = 41.9, longitude = 12.5, city = 'Roma' where id = tests.id('pp_soccorso2');
set local session_replication_role = origin;
commit;

-- ---------------- FASI 23/29: soccorso stradale ----------------
begin;
select tests.as_user(tests.id('soccorso'));
insert into public.roadside_operators (profile_id, services, vehicle_types, h24, price_notes)
values (tests.id('pp_soccorso'), '{carro_attrezzi,avviamento_batteria}', '{auto,suv}', false, 'Uscita in città da preventivare');
select tests.expect((select status = 'in_revisione' from public.roadside_operators where profile_id = tests.id('pp_soccorso')), 'nuovo operatore in revisione');
select tests.expect_error($$update public.roadside_operators set status = 'attivo' where profile_id = tests.id('pp_soccorso')$$, 'l''operatore non può attivarsi da solo');
select tests.expect_error($$update public.roadside_operators set available_until = now() + interval '3 days' where profile_id = tests.id('pp_soccorso')$$, 'disponibilità massima 24 ore');
update public.roadside_operators set available_until = now() + interval '4 hours' where profile_id = tests.id('pp_soccorso');
select tests.as_user(tests.id('officina'));
select tests.expect_error($$insert into public.roadside_operators (profile_id, services) values (tests.id('pp_soccorso'), '{carro_attrezzi}')$$, 'nessuno registra il servizio per un profilo altrui');
select tests.as_user(tests.id('dealer'));
select tests.expect_error($$insert into public.roadside_operators (profile_id, services) values (tests.id('pp_dealer'), '{carro_attrezzi}')$$, 'un concessionario non può offrire soccorso');
select tests.as_anon();
select tests.expect((select count(*) from public.public_roadside_operators()) = 0, 'operatore non verificato non visibile al pubblico');
select tests.as_user(tests.id('operatore'));
select tests.expect_error($$select public.admin_set_service_operator('soccorso', tests.id('pp_soccorso'), 'sospeso', '')$$, 'la sospensione richiede una motivazione');
select public.admin_set_service_operator('soccorso', tests.id('pp_soccorso'), 'attivo', null);
select tests.expect((select verified_at is not null from public.roadside_operators where profile_id = tests.id('pp_soccorso')), 'lo staff verifica e attiva l''operatore');
select tests.as_user(tests.id('soccorso2'));
insert into public.roadside_operators (profile_id, services, h24) values (tests.id('pp_soccorso2'), '{carro_attrezzi}', true);
select tests.as_user(tests.id('admin'));
select public.admin_set_service_operator('soccorso', tests.id('pp_soccorso2'), 'attivo', null);
select tests.as_anon();
select tests.expect((select count(*) from public.public_roadside_operators('milano')) = 1, 'elenco pubblico degli operatori attivi per città');
select tests.expect_error($$select public.create_roadside_request('Fiat Panda', 'auto', 'carro_attrezzi', 'Auto ferma, non parte più', 'strada', false, true, 'Milano, Navigli', '3331234567')$$, 'serve un account');

select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.create_roadside_request('Fiat Panda', 'auto', 'carro_attrezzi', 'Auto ferma, non parte più', 'strada', false, false, 'Milano, Navigli', '3331234567')$$,
  'senza conferma di sicurezza si rimanda al 112');
select tests.expect_error($$select public.create_roadside_request('Fiat Panda', 'auto', 'carro_attrezzi', 'Auto ferma, non parte più', 'strada', false, true, 'Milano, Navigli', '3331234567', 45.4521, 9.1765, false)$$,
  'la posizione esatta richiede il consenso');
insert into tests.ids select 'rs1', public.create_roadside_request('Fiat Panda bianca', 'auto', 'carro_attrezzi', 'Auto ferma, non parte più dopo un rumore', 'strada', false, true,
  'Milano, Navigli', '333 1234567', 45.45213, 9.17654, true, 'Via Vigevano 10, Milano', 'Officina Navigli');
select tests.expect((select approx_lat = 45.45 and approx_lng = 9.18 and status = 'in_ricerca' from public.roadside_requests where id = tests.id('rs1')), 'ai candidati solo la posizione arrotondata (~1 km)');
select tests.expect_error($$select public.create_roadside_request('Altra auto', 'auto', 'avviamento_batteria', 'Batteria scarica in garage', 'garage', false, true, 'Milano', '3331234567')$$, 'una sola richiesta di soccorso aperta');
select tests.expect((select count(*) from public.roadside_candidates(tests.id('rs1'))) = 1, 'candidati: solo operatori attivi, disponibili, con il servizio e nel raggio (Roma esclusa)');
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select * from public.roadside_candidates(tests.id('rs1'))$$, 'un altro utente non vede i candidati');
select tests.expect((select count(*) from public.roadside_requests) = 0, 'né la richiesta altrui');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.dispatch_roadside_request(tests.id('rs1'), array[tests.id('pp_soccorso2')])$$, 'non si contatta un operatore fuori zona');
select tests.expect(public.dispatch_roadside_request(tests.id('rs1'), array[tests.id('pp_soccorso')]) = 1, 'richiesta inviata all''operatore scelto');
select tests.expect((select status = 'inviata' from public.roadside_requests where id = tests.id('rs1')), 'stato inviata');

select tests.as_user(tests.id('soccorso'));
select tests.expect((select count(*) from public.roadside_requests where id = tests.id('rs1')) = 1, 'l''operatore contattato vede la richiesta');
select tests.expect((select count(*) from public.roadside_request_locations where request_id = tests.id('rs1')) = 0, 'ma non l''indirizzo e la posizione esatta prima della scelta');
select tests.expect((select count(*) from public.notifications where title = 'Richiesta di soccorso stradale') = 1, 'l''operatore riceve la notifica');
select tests.expect((select count(*) from public.conversation_participants cp join public.roadside_targets t on t.conversation_id = cp.conversation_id where t.request_id = tests.id('rs1')) = 2,
  'conversazione dedicata nel sistema messaggi');
select tests.expect_error($$select public.share_operator_location(tests.id('rs1'), 45.46, 9.19)$$, 'nessuna posizione condivisa prima dell''incarico');
insert into tests.ids select 'rq1', public.send_roadside_quote(tests.id('rs1'), 12000, 35, 'Traino fino a 15 km verso officina indicata', null, 60);
select tests.as_user(tests.id('soccorso2'));
select tests.expect_error($$select public.send_roadside_quote(tests.id('rs1'), 9000, 20, 'Traino', null, 60)$$, 'un operatore non contattato non può inviare preventivi');
select tests.as_user(tests.id('cliente'));
select tests.expect((select status = 'preventivo_ricevuto' from public.roadside_requests where id = tests.id('rs1')), 'preventivo ricevuto');
select public.accept_roadside_quote(tests.id('rq1'));
select tests.expect((select status = 'accettata' and operator_profile_id = tests.id('pp_soccorso') from public.roadside_requests where id = tests.id('rs1')), 'preventivo accettato, operatore assegnato');
select tests.expect_error($$select public.update_roadside_status(tests.id('rs1'), 'operatore_in_viaggio')$$, 'il cliente non aggiorna lo stato operativo');

select tests.as_user(tests.id('soccorso'));
select tests.expect((select address_text = 'Via Vigevano 10, Milano' and latitude = 45.45213 from public.roadside_request_locations where request_id = tests.id('rs1')), 'l''operatore scelto vede indirizzo e posizione esatta');
select public.update_roadside_status(tests.id('rs1'), 'operatore_in_viaggio', null);
select public.share_operator_location(tests.id('rs1'), 45.46, 9.19, 20);
select tests.expect_error($$select public.update_roadside_status(tests.id('rs1'), 'accettata')$$, 'gli stati non tornano indietro');
select public.update_roadside_status(tests.id('rs1'), 'operatore_arrivato', null);
select public.update_roadside_status(tests.id('rs1'), 'veicolo_caricato', null);
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.roadside_live_locations where request_id = tests.id('rs1')) = 1, 'il cliente vede la posizione dell''operatore durante l''intervento');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.roadside_live_locations) = 0, 'nessun altro vede la posizione');
select tests.as_user(tests.id('soccorso'));
select public.update_roadside_status(tests.id('rs1'), 'in_trasporto', null);
select public.update_roadside_status(tests.id('rs1'), 'consegnato', 'Consegnata in officina');
select tests.expect((select count(*) from public.roadside_live_locations where request_id = tests.id('rs1')) = 0, 'posizione cancellata alla consegna');
select tests.expect_error($$select public.share_operator_location(tests.id('rs1'), 45.46, 9.19)$$, 'condivisione impossibile a intervento concluso');
select tests.as_user(tests.id('cliente'));
select public.update_roadside_status(tests.id('rs1'), 'completata', null);
select tests.expect((select count(*) from public.roadside_events where request_id = tests.id('rs1')) >= 8, 'cronologia completa degli stati');
select tests.expect_error($$update public.roadside_events set note = 'x' where request_id = tests.id('rs1')$$, 'cronologia non modificabile');
select tests.as_user(tests.id('soccorso'));
select tests.expect((select count(*) from public.roadside_request_locations where request_id = tests.id('rs1')) = 0, 'a intervento chiuso l''operatore non vede più l''indirizzo');
rollback;

-- ---------------- FASE 28: trasporto auto ----------------
begin;
select tests.as_user(tests.id('trasporto'));
insert into public.transport_operators (profile_id, services, regions, insurance_declared, insurance_notes)
values (tests.id('pp_trasporto'), '{bisarca,carro_attrezzi}', '{Lombardia,Piemonte}', true, 'Polizza merci trasportate dichiarata');
select tests.as_user(tests.id('admin'));
select public.admin_set_service_operator('trasporto', tests.id('pp_trasporto'), 'attivo', null);

select tests.as_user(tests.id('cliente'));
insert into public.transport_requests (vehicle_desc, vehicle_drivable, service, pickup_city, pickup_region, delivery_city, delivery_region, date_from, date_to)
values ('Volkswagen Golf 2018', true, 'bisarca', 'Milano', 'Lombardia', 'Torino', 'Piemonte', current_date + 2, current_date + 10);
insert into tests.ids select 'tr1', id from public.transport_requests where vehicle_desc = 'Volkswagen Golf 2018';
select tests.expect_error($$insert into public.transport_requests (vehicle_desc, service, pickup_city, pickup_region, delivery_city, delivery_region, date_from, date_to)
  values ('Auto', 'bisarca', 'Milano', 'Lombardia', 'Roma', 'Lazio', current_date - 1, current_date + 3)$$, 'nessuna data di ritiro nel passato');
select tests.expect_error($$update public.transport_requests set status = 'completata' where id = tests.id('tr1')$$, 'il cliente non modifica lo stato direttamente');

select tests.as_user(tests.id('trasporto'));
select tests.expect((select count(*) from public.transport_requests where id = tests.id('tr1')) = 1, 'il trasportatore attivo vede le richieste aperte');
select tests.expect((select count(*) from public.transport_request_addresses) = 0, 'ma non gli indirizzi');
insert into tests.ids select 'tq1', public.send_transport_quote(tests.id('tr1'), 35000, current_date + 3, current_date + 4, true, 'Bisarca chiusa');
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.transport_requests) = 0, 'chi non è trasportatore attivo non vede le richieste altrui');
select tests.expect_error($$select public.send_transport_quote(tests.id('tr1'), 1000, current_date + 3, current_date + 4)$$, 'né invia preventivi');

select tests.as_user(tests.id('cliente'));
select tests.expect((select status = 'preventivi_ricevuti' from public.transport_requests where id = tests.id('tr1')), 'preventivi ricevuti');
select tests.expect_error($$select public.accept_transport_quote(tests.id('tq1'))$$, 'prima di accettare servono gli indirizzi');
insert into public.transport_request_addresses (request_id, pickup_address, delivery_address, contact_name, contact_phone)
values (tests.id('tr1'), 'Via Padova 1, Milano', 'Corso Francia 2, Torino', 'Mario Rossi', '3330000000');
select public.accept_transport_quote(tests.id('tq1'));
select tests.expect((select status = 'assegnata' and operator_profile_id = tests.id('pp_trasporto') from public.transport_requests where id = tests.id('tr1')), 'trasportatore assegnato');

select tests.as_user(tests.id('trasporto'));
select tests.expect((select contact_phone = '3330000000' from public.transport_request_addresses where request_id = tests.id('tr1')), 'dopo l''accettazione vede indirizzi e contatto');
select tests.expect_error($$select public.update_transport_status(tests.id('tr1'), 'ritirato')$$, 'il ritiro richiede il verbale');
select tests.expect_error($$select public.add_transport_report(tests.id('tr1'), 'ritiro', 45000, '1/2', null, null, array['altro-utente/foto.jpg'])$$, 'foto solo dalla propria cartella');
select public.add_transport_report(tests.id('tr1'), 'ritiro', 45000, '1/2', 'Graffio paraurti posteriore', null,
  array[tests.id('trasporto')::text || '/11111111-1111-1111-1111-111111111111.jpg'], 'Mario Rossi');
select tests.expect((select status = 'ritirato' from public.transport_requests where id = tests.id('tr1')), 'verbale di ritiro: stato ritirato');
select public.update_transport_status(tests.id('tr1'), 'in_transito', null);
select tests.expect_error($$select public.update_transport_status(tests.id('tr1'), 'completata')$$, 'il trasportatore non chiude da solo');
select public.add_transport_report(tests.id('tr1'), 'consegna', 45160, '1/4', null, 'Consegnata al destinatario', '{}', 'Luca Bianchi');
select tests.expect_error($$update public.transport_reports set damages = 'nessuno' where request_id = tests.id('tr1')$$, 'verbali non modificabili');

select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.update_transport_status(tests.id('tr1'), 'annullata')$$, 'dopo il ritiro non si annulla');
select public.update_transport_status(tests.id('tr1'), 'contestata', 'Nuovo graffio sulla portiera');
select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.notifications where title = 'Trasporto contestato dal cliente' and user_id = tests.id('admin')) = 1, 'la contestazione arriva allo staff');
select tests.as_user(tests.id('cliente'));
select public.update_transport_status(tests.id('tr1'), 'completata', null);
select tests.expect((select count(*) from public.transport_reports where request_id = tests.id('tr1')) = 2 and
  (select count(*) from public.transport_events where request_id = tests.id('tr1')) >= 6, 'verbali e cronologia visibili al cliente');
rollback;

select '=== TEST FASI 23, 28, 29 SUPERATI ===';

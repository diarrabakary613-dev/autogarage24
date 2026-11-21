-- =====================================================================
-- Test migrazione 0022 (Fasi 24, 25, 26): assicurazioni, revisioni, valutazioni e permute.
-- =====================================================================
\set ON_ERROR_STOP on

insert into tests.ids values ('centro', '10000000-0000-0000-0000-000000000031'), ('broker', '10000000-0000-0000-0000-000000000032');
insert into auth.users (id, email, raw_user_meta_data) values
  (tests.id('centro'), 'centro@test.local', jsonb_build_object('full_name', 'Centro', 'accepted_terms', 'true', 'requested_role', 'centro_revisione', 'business_name', 'Revisioni Lambrate')),
  (tests.id('broker'), 'broker@test.local', jsonb_build_object('full_name', 'Broker', 'accepted_terms', 'true', 'requested_role', 'cliente'));
insert into tests.ids select 'pp_centro', id from public.professional_profiles where user_id = tests.id('centro');

begin;
reset role;
set local session_replication_role = replica;
update public.professional_profiles set is_published = true, review_status = 'approvato', city = 'Milano', latitude = 45.48, longitude = 9.23
 where id in (tests.id('pp_centro'), tests.id('pp_dealer'), tests.id('pp_officina'));
-- Annunci comparabili (dati di prova del test): 4 Fiat Panda pubblicate a prezzi diversi.
insert into public.vehicles (id, owner_id, make_slug, make_name, model, year, mileage_km, fuel, transmission) values
  ('28000000-0000-0000-0000-000000000001', tests.id('dealer'), 'fiat', 'Fiat', 'Panda', 2020, 40000, 'benzina', 'manuale'),
  ('28000000-0000-0000-0000-000000000002', tests.id('dealer'), 'fiat', 'Fiat', 'Panda', 2021, 30000, 'benzina', 'manuale'),
  ('28000000-0000-0000-0000-000000000003', tests.id('dealer'), 'fiat', 'Fiat', 'Panda', 2019, 60000, 'benzina', 'manuale'),
  ('28000000-0000-0000-0000-000000000004', tests.id('dealer'), 'fiat', 'Fiat', 'Panda', 2020, 50000, 'benzina', 'manuale'),
  ('28000000-0000-0000-0000-000000000005', tests.id('dealer'), 'fiat', 'Fiat', '500X', 2022, 20000, 'benzina', 'manuale');
insert into public.vehicle_listings (id, vehicle_id, owner_id, professional_profile_id, seller_kind, title, slug, price_cents, city, description, status, published_at) values
  ('38000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000001', tests.id('dealer'), tests.id('pp_dealer'), 'professionista', 'Fiat Panda A', 'fiat-panda-a', 1000000, 'Milano', 'x', 'pubblicato', now()),
  ('38000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000002', tests.id('dealer'), tests.id('pp_dealer'), 'professionista', 'Fiat Panda B', 'fiat-panda-b', 1100000, 'Milano', 'x', 'pubblicato', now()),
  ('38000000-0000-0000-0000-000000000003', '28000000-0000-0000-0000-000000000003', tests.id('dealer'), tests.id('pp_dealer'), 'professionista', 'Fiat Panda C', 'fiat-panda-c', 850000, 'Milano', 'x', 'pubblicato', now()),
  ('38000000-0000-0000-0000-000000000004', '28000000-0000-0000-0000-000000000004', tests.id('dealer'), tests.id('pp_dealer'), 'professionista', 'Fiat Panda D', 'fiat-panda-d', 950000, 'Milano', 'x', 'venduto', now()),
  ('38000000-0000-0000-0000-000000000005', '28000000-0000-0000-0000-000000000005', tests.id('dealer'), tests.id('pp_dealer'), 'professionista', 'Fiat 500X', 'fiat-500x', 1800000, 'Milano', 'x', 'pubblicato', now());
set local session_replication_role = origin;
commit;

-- ---------------- FASE 25: calcolo scadenze ----------------
begin;
select tests.as_anon();
select tests.expect((select due_date = '2026-05-31' from public.inspection_due_date('autovettura', 'privato', '2022-05-10')), 'prima revisione: 4 anni dall''immatricolazione, fine mese');
select tests.expect((select due_date = '2028-03-31' from public.inspection_due_date('autovettura', 'privato', '2018-05-10', '2026-03-15', 'regolare')), 'successive: ogni 2 anni dall''ultima');
select tests.expect((select due_date = '2027-03-31' from public.inspection_due_date('autovettura', 'taxi', '2024-03-02', '2026-03-15', 'regolare')), 'taxi: annuale');
select tests.expect((select due_date = '2025-01-31' from public.inspection_due_date('pesante', 'privato', '2024-01-20')), 'oltre 3,5 t: prima revisione dopo un anno');
select tests.expect((select due_date = '2026-04-15' from public.inspection_due_date('autovettura', 'privato', '2018-05-10', '2026-03-15', 'ripetere')), 'esito ripetere: entro un mese');
select tests.expect((select source like 'Art. 80%' and checked_on is not null from public.inspection_due_date('autovettura', 'privato', '2022-05-10')), 'fonte normativa e data di aggiornamento sempre indicate');
select tests.expect((select count(*) from public.inspection_due_date('autovettura', 'privato', null)) = 0, 'senza date nessuna scadenza inventata');
rollback;

-- ---------------- FASE 25: centri, autorizzazioni, appuntamenti, storico ----------------
begin;
select tests.as_user(tests.id('centro'));
insert into public.inspection_centers (profile_id, vehicle_categories, services, hours_text) values (tests.id('pp_centro'), '{autovettura,moto}', '{revisione}', 'Lun–Ven 8–18');
select tests.expect_error($$insert into public.inspection_authorizations (profile_id, authority, authorization_number, categories, document_path)
  values (tests.id('pp_centro'), 'Motorizzazione Milano', 'MI1234', '{autovettura}', '10000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.pdf')$$, 'documento solo dalla propria cartella');
insert into public.inspection_authorizations (profile_id, authority, authorization_number, categories, document_path)
values (tests.id('pp_centro'), 'Motorizzazione Milano', 'MI1234', '{autovettura}', tests.id('centro')::text || '/11111111-1111-1111-1111-111111111111.pdf');
select tests.expect(not private.inspection_center_authorized(tests.id('pp_centro')), 'autorizzazione non verificata: centro non autorizzato');
select tests.as_user(tests.id('operatore'));
select public.admin_set_service_operator('revisione', tests.id('pp_centro'), 'attivo', null);
select tests.expect_error($$select public.admin_review_inspection_authorization((select id from public.inspection_authorizations limit 1), 'verificata', '')$$, 'la verifica richiede la descrizione del controllo');
select public.admin_review_inspection_authorization((select id from public.inspection_authorizations limit 1), 'verificata', 'Concessione verificata sul portale dell''automobilista il 20/11/2026');
select tests.as_anon();
select tests.expect((select authorized and not online_booking from public.search_inspection_centers(45.46, 9.19, 25)), 'centro trovato con autorizzazione verificata e senza prenotazione online');
select tests.expect((select count(*) from public.inspection_slots(tests.id('pp_centro'))) = 0, 'nessuno slot senza disponibilità reale');

select tests.as_user(tests.id('centro'));
insert into public.booking_settings (owner_id, slot_minutes, min_notice_hours, max_days_ahead) values (tests.id('centro'), 60, 0, 30);
insert into public.booking_availability (weekday, start_time, end_time) select g, '09:00', '11:00' from generate_series(1, 7) g;
select tests.as_user(tests.id('cliente'));
insert into public.user_vehicles (id, owner_id, make, model, year, registration_date, current_mileage_km) values ('98000000-0000-0000-0000-000000000001', tests.id('cliente'), 'Fiat', 'Panda', 2020, '2020-03-10', 50000);
insert into tests.ids select 'ia1', public.request_inspection(tests.id('pp_centro'), 'Fiat Panda', (select starts_at from public.inspection_slots(tests.id('pp_centro'), current_date + 2, 1) limit 1),
  null, null, '98000000-0000-0000-0000-000000000001', 'GA 123 BC');
select tests.expect_error($$select public.request_inspection(tests.id('pp_centro'), 'Altra auto', (select starts_at from public.inspection_appointments where id = tests.id('ia1')))$$, 'stesso orario non prenotabile due volte');
select tests.expect((select plate = 'GA123BC' and conversation_id is not null from public.inspection_appointments where id = tests.id('ia1')), 'targa normalizzata e conversazione creata');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.inspection_appointments) = 0, 'gli altri utenti non vedono l''appuntamento');
select tests.as_user(tests.id('centro'));
select tests.expect((select count(*) from public.notifications where title = 'Nuova richiesta di revisione') = 1, 'il centro riceve la notifica');
select public.respond_inspection(tests.id('ia1'), 'conferma');
select tests.expect_error($$select public.respond_inspection(tests.id('ia1'), 'completa', null, null, 'perfetto')$$, 'esito non valido rifiutato');
select public.respond_inspection(tests.id('ia1'), 'completa', null, null, 'regolare', 51200);
select tests.as_user(tests.id('cliente'));
select tests.expect((select verification = 'confermato_centro' and next_due_date is not null from public.inspection_records where appointment_id = tests.id('ia1')), 'esito confermato dal centro nello storico');
select tests.expect((select count(*) from public.maintenance_reminders where user_vehicle_id = '98000000-0000-0000-0000-000000000001' and category = 'revisione' and due_date is not null) = 1, 'promemoria di scadenza creato');
select tests.expect((select current_mileage_km = 51200 from public.user_vehicles where id = '98000000-0000-0000-0000-000000000001'), 'chilometraggio aggiornato');
select tests.expect((select count(*) from public.maintenance_records where user_vehicle_id = '98000000-0000-0000-0000-000000000001' and category = 'revisione' and source = 'professionista') = 1, 'revisione nello storico manutenzione');
insert into public.inspection_records (user_vehicle_id, inspected_on, outcome, center_name) values ('98000000-0000-0000-0000-000000000001', '2024-03-01', 'regolare', 'Centro dichiarato');
select tests.expect((select verification = 'dichiarato' from public.inspection_records where center_name = 'Centro dichiarato'), 'esito dichiarato dall''utente non risulta verificato');
select tests.expect_error($$insert into public.inspection_records (user_vehicle_id, inspected_on, outcome) values ('98000000-0000-0000-0000-000000000001', current_date + 3, 'regolare')$$, 'nessuna revisione con data futura');
select tests.expect_error($$update public.inspection_records set verification = 'confermato_centro'$$, 'l''utente non può dichiararsi verificato');
rollback;

-- ---------------- FASE 24: assicurazioni ----------------
begin;
select tests.as_user(tests.id('broker'));
select tests.expect_error($$insert into public.insurance_partners (name, partner_type, legal_name) values ('Falso', 'broker', 'Falso srl')$$, 'solo lo staff registra i partner');
select tests.as_user(tests.id('admin'));
insert into public.insurance_partners (id, name, partner_type, legal_name, rui_section, rui_number) values ('48000000-0000-0000-0000-000000000001', 'Broker Navigli', 'broker', 'Broker Navigli srl', 'B', 'B000123456');
select tests.expect_error($$update public.insurance_partners set status = 'verificato' where id = '48000000-0000-0000-0000-000000000001'$$, 'nessuna verifica senza controllo del registro e informativa privacy');
update public.insurance_partners set registry_checked_at = current_date, registry_evidence = 'RUI consultato il 20/11/2026', privacy_url = 'https://example.org/privacy' where id = '48000000-0000-0000-0000-000000000001';
select public.admin_set_insurance_partner_status('48000000-0000-0000-0000-000000000001', 'verificato');
select public.admin_add_insurance_partner_user('48000000-0000-0000-0000-000000000001', 'broker@test.local');
insert into public.insurance_integrations (partner_id, kind) values ('48000000-0000-0000-0000-000000000001', 'api');
select tests.expect((select status = 'non_configurato' from public.insurance_integrations), 'integrazione non configurata finché non esistono contratto e credenziali');

select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.insurance_integrations) = 0, 'gli utenti non vedono le integrazioni');
select tests.expect_error($$select public.create_insurance_request('Fiat', 'Panda', '{rca}', 'MI', array['48000000-0000-0000-0000-000000000001'::uuid], false)$$, 'senza consenso nessuna trasmissione');
insert into tests.ids select 'ir1', public.create_insurance_request('Fiat', 'Panda', '{rca,furto_incendio}', 'mi', array['48000000-0000-0000-0000-000000000001'::uuid], true,
  2020, 'benzina', 51, '2020-03-10', 'ga123bc');
select tests.expect((select province = 'MI' and plate = 'GA123BC' from public.insurance_quote_requests where id = tests.id('ir1')), 'dati normalizzati');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.insurance_quote_requests) = 0, 'gli altri utenti non vedono la richiesta');
select tests.as_user(tests.id('dealer'));
select tests.expect((select count(*) from public.insurance_quote_requests) = 0, 'un professionista non partner non vede la richiesta');
select tests.expect_error($$select public.submit_insurance_quote((select id from public.insurance_request_partners limit 1), 'RC', 40000, 'RC auto', 12, 'https://x.it/doc', current_date + 10)$$, 'nessun preventivo da chi non è partner');
select tests.as_user(tests.id('broker'));
select tests.expect((select plate = 'GA123BC' from public.insurance_quote_requests where id = tests.id('ir1')), 'il partner scelto riceve i dati con consenso');
select public.partner_update_insurance_request((select id from public.insurance_request_partners where request_id = tests.id('ir1')), 'in_lavorazione');
insert into tests.ids select 'iq1', public.submit_insurance_quote((select id from public.insurance_request_partners where request_id = tests.id('ir1')), 'RC Auto Base', 42000,
  'RC auto massimale minimo di legge, furto e incendio', 12, 'https://example.org/set-informativo.pdf', current_date + 15, 'Franchigia furto 10%', 'Massimali di legge', 'Guida da parte di neopatentati');
select tests.as_user(tests.id('cliente'));
select tests.expect((select source = 'partner' and annual_premium_cents = 42000 from public.insurance_quotes where id = tests.id('iq1')), 'preventivo del partner visibile al cliente');
select tests.expect((select count(*) from public.notifications where title = 'Preventivo assicurativo disponibile') = 1, 'notifica al cliente');
select public.withdraw_insurance_request(tests.id('ir1'));
select tests.as_user(tests.id('broker'));
select tests.expect((select count(*) from public.insurance_quote_requests where id = tests.id('ir1')) = 0, 'dopo il ritiro il partner non vede più i dati');
select tests.expect_error($$select public.submit_insurance_quote((select id from public.insurance_request_partners limit 1), 'RC', 40000, 'RC auto', 12, 'https://x.it/doc', current_date + 10)$$, 'nessun preventivo su richieste ritirate');
select tests.as_user(tests.id('cliente'));
select public.withdraw_insurance_request(tests.id('ir1'), true);
select tests.expect((select count(*) from public.insurance_quote_requests where id = tests.id('ir1')) = 0, 'il cliente può cancellare i dati della richiesta');
rollback;

-- ---------------- FASE 26: valutazione, offerte, permuta ----------------
begin;
select tests.as_user(tests.id('cliente'));
with x as (insert into public.vehicle_valuations (make, model, year, mileage_km, fuel, transmission, power_kw, condition, accidents, region, province)
values ('fiat', 'panda', 2020, 45000, 'benzina', 'manuale', 51, 'buone', 'nessuno', 'Lombardia', 'MI') returning id) insert into tests.ids select 'val1', id from x;
select tests.expect_error($$update public.vehicle_valuations set estimate_mid_cents = 9999999 where id = tests.id('val1')$$, 'il valore non si scrive dal client');
select tests.expect((select status = 'stimata' and comparables_count = 4 and estimate_min_cents < estimate_mid_cents and estimate_mid_cents < estimate_max_cents
  and estimate_mid_cents between 900000 and 1100000 and method like 'Stima interna preliminare%' from public.estimate_valuation(tests.id('val1'))),
  'stima da 4 annunci comparabili reali con forchetta e metodo');
with x as (insert into public.vehicle_valuations (make, model, year, mileage_km, condition, region, province)
values ('Lancia', 'Ypsilon', 2015, 90000, 'discrete', 'Lombardia', 'MI') returning id) insert into tests.ids select 'val2', id from x;
select tests.expect((select status = 'dati_insufficienti' and estimate_mid_cents is null and cardinality(missing_info) >= 3 from public.estimate_valuation(tests.id('val2'))),
  'senza comparabili nessun valore: si chiedono più informazioni');
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select public.estimate_valuation(tests.id('val1'))$$, 'nessuno stima l''auto di un altro');
select tests.expect((select count(*) from public.vehicle_valuations) = 0, 'né la vede');

select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.request_professional_valuation(tests.id('val1'), array[tests.id('pp_dealer')], '{}', true, 'vendita', null, false)$$, 'serve il consenso');
insert into tests.ids select 'vr1', public.request_professional_valuation(tests.id('val1'), array[tests.id('pp_dealer'), tests.id('pp_officina')], '{}', true, 'vendita', 'Vendo entro gennaio', true);
select tests.as_user(tests.id('dealer'));
select tests.expect((select count(*) from public.vehicle_valuations where id = tests.id('val1')) = 1, 'il professionista destinatario vede i dati dell''auto');
select tests.expect_error($$select public.professional_valuation_action(tests.id('vr1'), 'rifiuta', null, 'offerta_acquisto', null, true, 7, '')$$, 'il rifiuto va motivato');
insert into tests.ids select 'vo1', public.professional_valuation_action(tests.id('vr1'), 'proposta', 850000, 'offerta_acquisto', 'Salvo ispezione', true, 7);
select tests.as_user(tests.id('officina'));
select public.professional_valuation_action(tests.id('vr1'), 'rifiuta', null, 'offerta_acquisto', null, true, 7, 'Non ritiriamo auto usate');
select tests.as_user(tests.id('cliente'));
insert into tests.ids select 'vo2', public.respond_valuation_offer(tests.id('vo1'), 'controproposta', 920000, 'Chiedo 9.200');
select tests.expect_error($$select public.respond_valuation_offer(tests.id('vo2'), 'accetta')$$, 'non si accetta la propria controproposta');
select tests.as_user(tests.id('dealer'));
select public.respond_valuation_offer(tests.id('vo2'), 'accetta');
select tests.as_user(tests.id('cliente'));
select tests.expect((select status = 'chiusa' from public.valuation_requests where id = tests.id('vr1')), 'offerta di acquisto accettata: richiesta chiusa');
select tests.expect((select count(*) from public.negotiation_events where context_id = tests.id('vr1')) >= 4, 'storico della trattativa');

insert into tests.ids select 'tp1', public.propose_trade_in('38000000-0000-0000-0000-000000000005', tests.id('val1'), 900000, 'Permuto la Panda');
select tests.expect((select difference_cents = 900000 and listing_price_cents = 1800000 from public.trade_in_proposals where id = tests.id('tp1')), 'differenza indicativa calcolata dal server sul prezzo reale');
select tests.expect_error($$select public.propose_trade_in('38000000-0000-0000-0000-000000000005', tests.id('val1'), 900000)$$, 'una sola permuta aperta per auto');
select tests.expect_error($$select public.respond_trade_in(tests.id('tp1'), 'accetta')$$, 'l''acquirente non accetta la propria proposta');
select tests.as_user(tests.id('dealer'));
select public.respond_trade_in(tests.id('tp1'), 'ispezione', null, 'Portala in sede per un controllo');
select public.respond_trade_in(tests.id('tp1'), 'controproposta', 800000);
select tests.as_user(tests.id('cliente'));
select public.respond_trade_in(tests.id('tp1'), 'accetta');
select tests.expect((select status = 'accettata' from public.trade_in_proposals where id = tests.id('tp1')), 'permuta accettata dopo controproposta');
delete from public.vehicle_valuations where id = tests.id('val1');
select tests.expect((select count(*) from public.vehicle_valuations where id = tests.id('val1')) = 1, 'valutazione usata in una permuta non eliminabile');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.trade_in_proposals) = 0, 'le permute altrui non sono visibili');
rollback;

select '=== TEST FASI 24, 25, 26 SUPERATI ===';

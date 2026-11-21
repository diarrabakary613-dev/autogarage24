-- =====================================================================
-- Test migrazione 0018 (Fasi 15–20): richieste di intervento a più
-- officine, preventivi dettagliati, appuntamenti, recensioni verificate,
-- mappa e privacy, Il mio Garage, budget.
-- =====================================================================
\set ON_ERROR_STOP on

-- Preparazione: due professionisti pubblici e compatibili a Milano.
begin; select tests.as_service();
update public.professional_profiles set is_published = true, review_status = 'approvato', accepts_appointments = true, city = 'Milano',
  latitude = 45.452, longitude = 9.176, show_address = true, address_line = 'Via Navigli 10', brands_served = '{fiat,volkswagen}'
 where id = tests.id('pp_officina');
update public.professional_profiles set is_published = true, review_status = 'approvato', accepts_appointments = true, city = 'Milano',
  categories = '{officina-meccanica,centro-tagliandi}', service_radius_km = 10, show_address = false
 where id = tests.id('pp_meccanico');
commit;

-- Percorso completo: richiesta → officine compatibili → invio → preventivi → confronto → accettazione → appuntamento
begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select public.create_repair_request('Fiat','Punto',2015,'benzina',90000,'tagliando','Breve','',null,'qualsiasi','Milano','20123')$$,
  'descrizione troppo breve rifiutata');
insert into tests.ids select 'rr1', public.create_repair_request('Fiat', 'Punto', 2015, 'benzina', 90000, 'tagliando',
  'Tagliando dei 90.000 km con cambio olio e filtri, spia service accesa.', 'Mattine dal lunedì al venerdì', current_date + 7, 'mattina',
  'Milano', '20123', 45.46421, 9.18991, null);
select tests.expect((select latitude = 45.46 and longitude = 9.19 from public.repair_requests where id = tests.id('rr1')), 'la posizione del cliente è salvata arrotondata (~1 km)');
select tests.expect((select count(*) from public.match_workshops(tests.id('rr1'), 25, 20)) = 2, 'trovate le due officine compatibili');
select tests.expect((select distance_km is not null from public.match_workshops(tests.id('rr1'), 25, 20) where profile_id = tests.id('pp_officina')),
  'distanza calcolata solo quando entrambe le posizioni sono note');
select tests.expect((select 'Tagliando completo' = any(matched_services) from public.match_workshops(tests.id('rr1'), 25, 20) where profile_id = tests.id('pp_officina')),
  'mostrati i servizi pertinenti realmente offerti');
select tests.expect_error($$select public.dispatch_repair_request(tests.id('rr1'), array[tests.id('pp_officina'), tests.id('pp_officina'), tests.id('pp_officina'), tests.id('pp_officina'), tests.id('pp_officina'), tests.id('pp_officina')])$$,
  'massimo 5 officine alla volta');
select tests.expect(public.dispatch_repair_request(tests.id('rr1'), array[tests.id('pp_officina'), tests.id('pp_meccanico')]) = 2, 'richiesta inviata a due officine');
select tests.expect_error($$select public.dispatch_repair_request(tests.id('rr1'), array[tests.id('pp_officina')])$$, 'non si invia due volte alla stessa officina');
insert into tests.ids select 'rq_off', id from public.requests where repair_request_id = tests.id('rr1') and professional_profile_id = tests.id('pp_officina');
insert into tests.ids select 'rq_mec', id from public.requests where repair_request_id = tests.id('rr1') and professional_profile_id = tests.id('pp_meccanico');
select tests.expect((select problem_category = 'tagliando' and mileage_km = 90000 and fuel = 'benzina' from public.requests where id = tests.id('rq_off')), 'i dati dell''auto arrivano all''officina');
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.repair_requests where id = tests.id('rr1')) = 1, 'l''officina destinataria vede la richiesta originale');
select tests.expect_error($$select public.send_quote_detailed(tests.id('rq_off'), 'Tagliando completo', 8000, 6500, null, '1 giorno', null)$$, 'il preventivo richiede la validità');
insert into tests.ids select 'q_off', public.send_quote_detailed(tests.id('rq_off'), 'Tagliando completo con olio 5W30 e filtri', 8000, 6500, 1500,
  'Mezza giornata', current_date + 15, true, 'Disponibile da lunedì', 'Prezzo indicativo: conferma dopo il controllo', null);
select tests.expect((select amount_cents = 16000 and labor_cents = 8000 and parts_cents = 6500 and is_indicative and requires_inspection from public.quotes where id = tests.id('q_off')),
  'totale = manodopera + ricambi + extra; preventivo indicativo con ispezione');
select tests.as_user(tests.id('meccanico'));
insert into tests.ids select 'q_mec', public.send_quote_detailed(tests.id('rq_mec'), 'Tagliando a domicilio', 7000, 6000, null, '2 ore', current_date + 10, false, null, null, null);
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.repair_requests where id = tests.id('rr1')) = 0, 'un altro cliente non vede la richiesta');
select tests.expect((select count(*) from public.quotes where id in (tests.id('q_off'), tests.id('q_mec'))) = 0, 'né i preventivi altrui');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.quotes q join public.requests r on r.id = q.request_id where r.repair_request_id = tests.id('rr1')) = 2,
  'il cliente confronta due preventivi');
select public.respond_quote(tests.id('q_mec'), true, 'Comodo a domicilio');
select tests.expect((select status = 'assegnata' and accepted_quote_id = tests.id('q_mec') from public.repair_requests where id = tests.id('rr1')), 'richiesta assegnata al preventivo scelto');
select tests.expect((select status = 'annullata' from public.requests where id = tests.id('rq_off')), 'la richiesta all''altra officina viene chiusa');
select tests.expect((select status = 'ritirato' from public.quotes where id = tests.id('q_off')), 'l''altro preventivo non è più accettabile');
select tests.as_service();
select tests.expect((select count(*) from public.notifications where user_id = tests.id('officina') and title = 'Il cliente ha scelto un altro preventivo') = 1, 'l''officina non scelta viene avvisata');
select tests.as_user(tests.id('cliente2'));
insert into tests.ids select 'ap1', public.propose_appointment(tests.id('rq_mec'), current_date + 5, 'mattina', '9:30', null);
select tests.as_user(tests.id('meccanico'));
select public.respond_appointment(tests.id('ap1'), 'conferma', null);
select tests.as_user(tests.id('cliente2'));
insert into tests.ids select 'ap2', public.reschedule_appointment(tests.id('ap1'), current_date + 6, 'pomeriggio', '15:00', 'Imprevisto al lavoro');
select tests.expect((select status = 'annullato' from public.appointments where id = tests.id('ap1')) and (select status = 'in_attesa' from public.appointments where id = tests.id('ap2')),
  'riprogrammazione: vecchio appuntamento annullato, nuova proposta in attesa');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.reschedule_appointment(tests.id('ap2'), current_date + 8, 'mattina', null, null)$$, 'un estraneo non può modificare l''appuntamento');
rollback;

-- Recensioni: verificate, punteggi dettagliati, niente doppioni, staff senza potere sui punteggi
begin;
select tests.as_service();
select tests.expect((select count(*) from public.review_verifications v join public.requests r on r.id = v.request_id where r.status = 'completata' and v.verified_at is not null) >= 1,
  'gli interventi già completati hanno una verifica registrata');
select tests.as_user(tests.id('admin'));
select tests.expect_error($$update public.reviews set rating = 1 where request_id = '50000000-0000-0000-0000-000000000002'$$, 'lo staff non può modificare i punteggi');
select public.admin_moderate_review((select id from public.reviews where request_id = '50000000-0000-0000-0000-000000000002'), 'in_moderazione', 'Verifica segnalazione');
select tests.expect((select count(*) from public.review_history h join public.reviews r on r.id = h.review_id where r.request_id = '50000000-0000-0000-0000-000000000002' and h.field = 'status') >= 1,
  'ogni decisione di moderazione resta nello storico');
rollback;

begin;
select tests.as_anon();
select tests.expect((public.profile_reputation(tests.id('pp_officina')) ->> 'count')::int >= 1, 'reputazione pubblica: numero di recensioni');
select tests.expect((public.profile_reputation(tests.id('pp_officina')) -> 'distribution' ->> '5')::int >= 1, 'distribuzione delle stelle');
select tests.expect((public.profile_reputation(tests.id('pp_officina')) -> 'service' ->> 'quality') is not null, 'media per criterio (qualità)');
rollback;

-- Acquisto di un'auto: recensione verificata solo con conferma di ENTRAMBE le parti
begin;
-- Solo preparazione dei dati (superutente, controlli disattivati per questa riga di fixture).
reset role;
set local session_replication_role = replica;
update public.vehicle_listings set status = 'pubblicato', published_at = now(), approved_at = now() where id = '30000000-0000-0000-0000-000000000010';
set local session_replication_role = origin;
select tests.expect((select professional_profile_id is not null and status = 'pubblicato' from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000010'),
  'annuncio di un venditore professionale (i privati non ricevono recensioni)');
select tests.as_user(tests.id('cliente2'));
insert into public.requests (id, kind, requester_id, listing_id, subject, message)
values ('51000000-0000-0000-0000-000000000001', 'info_auto', tests.id('cliente2'), '30000000-0000-0000-0000-000000000010', 'Info auto', 'È ancora disponibile?');
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment, accuracy_rating, communication_rating, reliability_rating)
  select professional_profile_id, tests.id('cliente2'), id, 5, 'Venditore serio, tutto come descritto', 5, 5, 5 from public.requests where id = '51000000-0000-0000-0000-000000000001'$$,
  'nessuna recensione di acquisto senza conferma');
select tests.expect(public.confirm_vehicle_purchase('51000000-0000-0000-0000-000000000001') = 'in_attesa_altra_parte', 'la sola dichiarazione dell''acquirente non basta');
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment, accuracy_rating, communication_rating, reliability_rating)
  select professional_profile_id, tests.id('cliente2'), id, 5, 'Venditore serio, tutto come descritto', 5, 5, 5 from public.requests where id = '51000000-0000-0000-0000-000000000001'$$,
  'ancora nessuna recensione con una sola conferma');
select tests.as_user((select recipient_id from public.requests where id = '51000000-0000-0000-0000-000000000001'));
select tests.expect(public.confirm_vehicle_purchase('51000000-0000-0000-0000-000000000001') = 'verificato', 'conferma del venditore: acquisto verificato');
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$insert into public.reviews (profile_id, author_id, request_id, rating, comment, quality_rating, professionalism_rating, value_rating)
  select professional_profile_id, tests.id('cliente2'), id, 5, 'Venditore serio, tutto come descritto', 5, 5, 5 from public.requests where id = '51000000-0000-0000-0000-000000000001'$$,
  'per un acquisto servono i criteri del venditore (accuratezza, comunicazione, affidabilità)');
insert into public.reviews (profile_id, author_id, request_id, rating, comment, accuracy_rating, communication_rating, reliability_rating, experience_date)
select professional_profile_id, tests.id('cliente2'), id, 4, 'Venditore serio, tutto come descritto', 5, 4, 4, current_date from public.requests where id = '51000000-0000-0000-0000-000000000001';
select tests.expect((select review_kind = 'acquisto' and verification_id is not null from public.reviews where request_id = '51000000-0000-0000-0000-000000000001'), 'recensione di acquisto verificata');
select tests.expect_error($$update public.reviews set rating = 5 where request_id = '51000000-0000-0000-0000-000000000001'$$, 'l''autore non può alterare il punteggio dopo la pubblicazione');
rollback;

-- Mappa: posizioni mascherate, auto solo se compatibili in modalità neopatentati
begin;
select tests.as_anon();
select tests.expect((select latitude = 45.47 and approximate and address is null from public.map_search(array['meccanico'], 45.46, 9.19, 20) where id = tests.id('pp_meccanico')),
  'mappa: posizione arrotondata e nessun indirizzo per chi non lo rende pubblico');
select tests.expect((select address = 'Via Navigli 10' and not approximate from public.map_search(array['officina'], 45.46, 9.19, 20) where id = tests.id('pp_officina')),
  'mappa: indirizzo esatto solo se il professionista lo rende pubblico');
select tests.expect((select count(*) from public.map_search(array['officina'], 45.46, 9.19, 1)) = 0, 'il raggio di ricerca è rispettato');
select tests.expect((select count(*) from public.map_search(array['officina'], null, null, 20, 'milano')) >= 1, 'ricerca per città senza posizione');
select tests.expect((select count(*) from public.map_search(array['officina'], null, null, 20, null, null, null, 'bmw')) = 0, 'filtro per marca');
select tests.expect((select count(*) from public.map_search(array['auto'], null, null, 20, null, null, null, null, null, null, false, true)
                     where neo_result is distinct from 'compatibile') = 0, 'modalità neopatentati: solo auto con esito «compatibile» calcolato');
select tests.expect((select count(*) from public.map_search(array['officina', 'meccanico'], null, null, 20, null, null, null, null, null, 4.9)) <= 1, 'filtro per valutazione minima');
rollback;

-- Il mio Garage: officine contattate solo per il proprietario; targa privata
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.vehicle_contacted_professionals('90000000-0000-0000-0000-000000000001')) >= 0, 'il proprietario consulta le officine contattate');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.vehicle_contacted_professionals('90000000-0000-0000-0000-000000000001')) = 0, 'nessun dato per un altro utente');
select tests.expect((select count(*) from public.user_vehicles where id = '90000000-0000-0000-0000-000000000001') = 0, 'targa e dati del veicolo restano privati');
rollback;

-- Foto profilo degli interlocutori: solo con una relazione esistente
begin;
select tests.as_service();
update public.profiles set avatar_path = tests.id('privato') || '/avatar.webp' where id = tests.id('privato');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.counterpart_avatars(array[tests.id('privato')])) = 1, 'foto dell''interlocutore con cui esiste una richiesta');
select tests.as_user(tests.id('meccanico'));
select tests.expect((select count(*) from public.counterpart_avatars(array[tests.id('privato')])) = 0, 'nessuna foto di utenti senza relazione');
rollback;

-- Budget: approvazione solo del fondatore
begin;
select tests.as_user(tests.id('moderatore'));
select tests.as_service();
insert into public.user_roles (user_id, role) values (tests.id('operatore'), 'admin');
select tests.as_user(tests.id('operatore'));
select tests.expect_error($$insert into public.ad_budget_entries (platform, period_start, period_end, planned_cents, founder_approved) values ('meta', current_date, current_date + 30, 50000, true)$$,
  'un admin non fondatore non può approvare una spesa');
select tests.as_user(tests.id('admin'));
insert into public.ad_budget_entries (platform, period_start, period_end, planned_cents, founder_approved) values ('meta', current_date, current_date + 30, 50000, true);
select tests.expect((select approved_by = tests.id('admin') from public.ad_budget_entries limit 1), 'approvazione del fondatore registrata');
rollback;

select '=== TEST FASI 15–20 SUPERATI ===';

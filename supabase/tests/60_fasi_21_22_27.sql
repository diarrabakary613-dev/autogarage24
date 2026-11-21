-- =====================================================================
-- Test migrazione 0020 (Fasi 21, 22, 27): offerte e coupon, marketplace
-- auto (verifiche, storico prezzi, preferiti), prenotazioni e test drive.
-- =====================================================================
\set ON_ERROR_STOP on

-- ---------------- FASE 21: offerte, approvazione, coupon, riscatto ----------------
begin;
select tests.as_user(tests.id('officina'));
insert into public.promotional_offers (id, profile_id, title, description, category, original_price_cents, promo_price_cents, conditions, starts_on, ends_on, quantity_total, status, neo_dedicated, neo_topic, slug)
values ('70000000-0000-0000-0000-000000000001', tests.id('pp_officina'), 'Tagliando completo neopatentati', 'Tagliando con olio, filtri e controllo di 30 punti per la prima auto.',
        'tagliandi', 20000, 15000, 'Valida su prenotazione, auto fino a 1.6.', current_date, current_date + 30, 2, 'in_revisione', true, 'prima_manutenzione', 'x');
select tests.expect((select discount_pct = 25 from public.promotional_offers where id = '70000000-0000-0000-0000-000000000001'), 'percentuale di sconto calcolata automaticamente (25%)');
select tests.expect((select status = 'in_revisione' and slug <> 'x' from public.promotional_offers where id = '70000000-0000-0000-0000-000000000001'), 'offerta in revisione, slug generato dal sistema');
select tests.expect_error($$update public.promotional_offers set status = 'pubblicata' where id = '70000000-0000-0000-0000-000000000001'$$, 'il partner non può auto-pubblicarsi');
select tests.expect_error($$insert into public.promotional_offers (profile_id, title, description, category, original_price_cents, promo_price_cents, conditions, starts_on, ends_on, slug)
  values (tests.id('pp_officina'), 'Sconto finto rialzato', 'Prezzo promozionale più alto del prezzo pieno.', 'freni', 10000, 12000, 'Nessuna condizione valida', current_date, current_date + 5, 'x')$$,
  'il prezzo promozionale deve essere inferiore al prezzo originale');
select tests.as_anon();
select tests.expect((select count(*) from public.promotional_offers where id = '70000000-0000-0000-0000-000000000001') = 0, 'non visibile al pubblico prima dell''approvazione');
select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.notifications where title = 'Offerta da approvare' and user_id = tests.id('admin')) >= 1, 'lo staff riceve la notifica di revisione');
select tests.expect_error($$select public.admin_moderate_offer('70000000-0000-0000-0000-000000000001', 'rifiutata', '')$$, 'il rifiuto richiede una motivazione');
select public.admin_moderate_offer('70000000-0000-0000-0000-000000000001', 'pubblicata', null);
select tests.as_anon();
select tests.expect((select count(*) from public.search_offers(null, null, 25, 'milano', 'tagliandi', true)) = 1, 'ricerca per città, categoria e neopatentati');
select tests.expect((select count(*) from public.search_offers(45.46, 9.19, 5, null, null, false)) = 1, 'ricerca per raggio dalla posizione');
select tests.expect((select count(*) from public.search_offers(41.9, 12.5, 25, null, null, false)) = 0, 'fuori raggio (Roma) nessun risultato');
select public.track_offer((select slug from public.promotional_offers where id = '70000000-0000-0000-0000-000000000001'), false);
select tests.expect_error($$select public.claim_offer('70000000-0000-0000-0000-000000000001')$$, 'serve un account per richiedere l''offerta');
select tests.as_user(tests.id('officina'));
insert into public.promotional_coupons (profile_id, offer_id, code, discount_type, discount_value, max_uses, valid_until, categories)
values (tests.id('pp_officina'), '70000000-0000-0000-0000-000000000001', 'prima10', 'percentuale', 10, 1, current_date + 10, '{tagliandi}');
select tests.expect((select code = 'PRIMA10' and uses_count = 0 from public.promotional_coupons where code = 'PRIMA10'), 'codice coupon normalizzato e univoco');
select tests.expect_error($$insert into public.promotional_coupons (profile_id, code, discount_type, discount_value, valid_until) values (tests.id('pp_officina'), 'Prima10', 'importo', 5, current_date + 3)$$, 'nessun codice duplicato');
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select * from public.claim_offer('70000000-0000-0000-0000-000000000001', 'NONESISTE')$$, 'codice inesistente rifiutato');
create temp table c2 on commit drop as select * from public.claim_offer('70000000-0000-0000-0000-000000000001', 'prima10', 'Vorrei sabato');
select tests.expect((select estimated_cents = 13500 and claim_code ~ '^AG24-[A-Z0-9]{8}$' from c2), 'coupon applicato lato server (15000 - 10%) e codice personale generato');
select tests.expect_error($$select * from public.claim_offer('70000000-0000-0000-0000-000000000001')$$, 'nessuna seconda richiesta attiva per la stessa offerta');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select * from public.claim_offer('70000000-0000-0000-0000-000000000001', 'PRIMA10')$$, 'coupon esaurito: impedito l''utilizzo oltre il massimo');
create temp table c1 on commit drop as select * from public.claim_offer('70000000-0000-0000-0000-000000000001');
select tests.as_service();
select tests.expect((select status = 'esaurita' from public.promotional_offers where id = '70000000-0000-0000-0000-000000000001'), 'quantità esaurita dopo 2 richieste');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.offer_claims where offer_id = '70000000-0000-0000-0000-000000000001') = 1, 'il cliente vede solo la propria richiesta');
select tests.expect_error($$select public.update_offer_claim((select claim_id from c1), 'utilizzato')$$, 'il cliente non può segnare come utilizzato');
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.offer_claims where offer_id = '70000000-0000-0000-0000-000000000001') = 2, 'il partner vede le richieste ricevute');
select tests.expect_error($$select public.update_offer_claim((select claim_id from c2), 'utilizzato')$$, 'l''utilizzo va prima confermato');
select public.update_offer_claim((select claim_id from c2), 'confermato');
select public.update_offer_claim((select claim_id from c2), 'utilizzato');
select tests.expect_error($$select public.update_offer_claim((select claim_id from c2), 'annullato')$$, 'un riscatto utilizzato non si riapre');
select tests.expect((select views = 1 and claims = 2 and confirmed = 1 and used = 1 and coupons_used = 1 from public.offer_stats(tests.id('pp_officina')) where offer_id = '70000000-0000-0000-0000-000000000001'),
  'statistiche: visualizzazioni, richieste, confermate, utilizzate e coupon distinti');
select tests.as_user(tests.id('meccanico'));
select tests.expect((select count(*) from public.offer_stats(tests.id('pp_officina'))) = 0, 'un altro partner non vede le statistiche');
select tests.expect((select count(*) from public.promotional_coupons) = 0, 'né i coupon altrui');
rollback;

-- Scadenze lato server
begin;
select tests.as_user(tests.id('officina'));
insert into public.promotional_offers (id, profile_id, title, description, category, original_price_cents, promo_price_cents, conditions, starts_on, ends_on, slug)
values ('70000000-0000-0000-0000-000000000002', tests.id('pp_officina'), 'Offerta freni scaduta', 'Pastiglie anteriori con montaggio incluso nel prezzo.', 'freni', 12000, 9000,
        'Fino ad esaurimento scorte', current_date - 10, current_date - 1, 'x');
select tests.as_user(tests.id('admin'));
select public.admin_moderate_offer('70000000-0000-0000-0000-000000000002', 'pubblicata', null);
select tests.expect((select status = 'scaduta' from public.promotional_offers where id = '70000000-0000-0000-0000-000000000002'), 'un''offerta oltre la scadenza non risulta pubblicata');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select * from public.claim_offer('70000000-0000-0000-0000-000000000002')$$, 'riscatto impossibile su offerta scaduta');
rollback;

-- Preferiti delle offerte riusano la tabella favorites
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$insert into public.favorites (user_id, listing_id, offer_id) values (tests.id('cliente'), '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001')$$,
  'un preferito riguarda un solo elemento');
rollback;

-- ---------------- FASE 22: verifiche, storico prezzi, notifiche, privati ----------------
begin;
select tests.as_user(tests.id('privato'));
select tests.expect_error($$insert into public.vehicle_verifications (listing_id, kind, evidence) values ('30000000-0000-0000-0000-000000000001', 'documentazione', 'Mi verifico da solo il libretto')$$,
  'il venditore non può auto-certificare l''annuncio');
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_verify_listing('30000000-0000-0000-0000-000000000001', 'dati_tecnici', 'ok')$$, 'serve un''evidenza documentata');
select public.admin_verify_listing('30000000-0000-0000-0000-000000000001', 'dati_tecnici', 'Carta di circolazione visionata: potenza e tara coincidono');
select tests.as_anon();
select tests.expect((select count(*) from public.vehicle_verifications where listing_id = '30000000-0000-0000-0000-000000000001' and revoked_at is null) = 1, 'verifica visibile sulla scheda pubblica');
select tests.as_service();
update public.vehicle_listings set price_cents = price_cents - 50000 where id = '30000000-0000-0000-0000-000000000001';
select tests.expect((select count(*) from public.vehicle_price_history where listing_id = '30000000-0000-0000-0000-000000000001') = 1, 'variazione di prezzo registrata');
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente') and title = 'Prezzo ridotto su un''auto salvata') = 1,
  'chi ha salvato l''auto riceve la notifica');
select tests.expect((select count(*) from public.admin_audit_logs where action = 'listing.verified') = 1, 'verifica registrata nel registro attività');
rollback;

begin;
select tests.as_user(tests.id('admin'));
select public.admin_set_setting('private_sellers_enabled', 'false');
select tests.as_user(tests.id('cliente2'));
insert into public.vehicles (id, owner_id, make_slug, make_name, model, year) values ('20000000-0000-0000-0000-000000000070', tests.id('cliente2'), 'fiat', 'Fiat', 'Punto', 2016);
select tests.expect_error($$insert into public.vehicle_listings (vehicle_id, owner_id, title, slug) values ('20000000-0000-0000-0000-000000000070', tests.id('cliente2'), 'Fiat Punto', '')$$,
  'privati disattivati dall''amministratore: pubblicazione bloccata');
select tests.expect_error($$select public.admin_set_setting('private_sellers_enabled', 'true')$$, 'solo lo staff cambia le impostazioni');
rollback;

-- ---------------- FASE 27: disponibilità, prenotazioni, test drive ----------------
begin;
select tests.as_user(tests.id('privato'));
insert into public.booking_settings (owner_id, slot_minutes, min_notice_hours, max_days_ahead, test_drive_enabled, test_drive_min_years, meeting_address)
values (tests.id('privato'), 60, 0, 14, true, 2, 'Via Privata 1, Milano');
insert into public.booking_availability (owner_id, weekday, start_time, end_time) select tests.id('privato'), d, '09:00', '12:00' from generate_series(1, 7) d;
select tests.as_anon();
select tests.expect((select count(*) from public.booking_slots('30000000-0000-0000-0000-000000000001', current_date + 2, 1)) = 3, 'tre slot da un''ora tra le 9 e le 12');
select tests.expect((select bool_and((s.starts_at at time zone 'Europe/Rome')::time in ('09:00', '10:00', '11:00')) from public.booking_slots('30000000-0000-0000-0000-000000000001', current_date + 2, 1) s),
  'orari espressi nel fuso di Roma (anche con l''ora legale)');
select tests.expect((select count(*) from public.booking_slots('30000000-0000-0000-0000-000000000003', null, 3)) = 0, 'nessuno slot inventato per annunci senza disponibilità');
select tests.as_user(tests.id('cliente2'));
create temp table s on commit drop as select starts_at from public.booking_slots('30000000-0000-0000-0000-000000000001', current_date + 2, 1) order by 1;
select tests.expect_error($$select public.create_booking('30000000-0000-0000-0000-000000000001', 'test_drive', (select min(starts_at) from s))$$, 'test drive senza conferma della patente rifiutato');
select tests.expect_error($$select public.create_booking('30000000-0000-0000-0000-000000000001', 'test_drive', (select min(starts_at) from s), null, null, null, true, 1, true)$$,
  'esperienza di guida inferiore al requisito del venditore');
select tests.expect_error($$select public.create_booking('30000000-0000-0000-0000-000000000001', 'visione', (select min(starts_at) from s) + interval '7 minutes')$$, 'solo orari realmente disponibili');
insert into tests.ids select 'bk1', public.create_booking('30000000-0000-0000-0000-000000000001', 'visione_test_drive', (select min(starts_at) from s),
  (select max(starts_at) from s), 'Vorrei provarla', '3331234567', true, 5, true);
select tests.expect((select count(*) from public.booking_meeting_info(tests.id('bk1'))) = 0, 'indirizzo nascosto prima della conferma');
select tests.expect((select r.conversation_id is not null from public.vehicle_bookings b join public.requests r on r.id = b.request_id where b.id = tests.id('bk1')), 'prenotazione collegata alla conversazione');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.create_booking('30000000-0000-0000-0000-000000000001', 'visione', (select min(starts_at) from s))$$, 'stesso orario non prenotabile due volte');
select tests.expect((select count(*) from public.vehicle_bookings) = 0, 'un altro utente non vede la prenotazione');
select tests.as_user(tests.id('privato'));
select public.respond_booking(tests.id('bk1'), 'conferma', null, null);
select tests.expect((select status = 'confermato' from public.vehicle_bookings where id = tests.id('bk1')), 'confermato dal venditore');
select tests.expect((select count(*) from public.booking_slots('30000000-0000-0000-0000-000000000001', current_date + 2, 1)) = 2,
  'l''orario confermato non è più prenotabile');
select public.respond_booking(tests.id('bk1'), 'proponi', (select min(starts_at) from s) + interval '1 hour', 'Ho un imprevisto');
select tests.as_user(tests.id('cliente2'));
select public.respond_booking(tests.id('bk1'), 'accetta_modifica', null, null);
select tests.expect((select status = 'confermato' and starts_at = (select min(starts_at) from s) + interval '1 hour' from public.vehicle_bookings where id = tests.id('bk1')), 'nuovo orario accettato');
select tests.expect((select address = 'Via Privata 1, Milano' from public.booking_meeting_info(tests.id('bk1'))), 'indirizzo visibile dopo la conferma');
select tests.expect_error($$select public.respond_booking(tests.id('bk1'), 'completa', null, null)$$, 'solo il venditore segna l''esito');
select tests.expect_error($$select public.respond_booking(tests.id('bk1'), 'annulla', null, '')$$, 'annullare un appuntamento confermato richiede il motivo');
select public.respond_booking(tests.id('bk1'), 'annulla', null, 'Ho trovato un''altra auto');
select tests.expect((select count(*) from public.vehicle_booking_events where booking_id = tests.id('bk1')) = 5, 'storico completo delle modifiche');
select tests.as_service();
select tests.expect((select count(*) from public.notifications where user_id = tests.id('privato') and title = 'Nuova richiesta di appuntamento') = 1, 'notifica al venditore');
rollback;

-- Promemoria automatici 24 h e 2 h (senza duplicati)
begin;
select tests.as_service();
insert into public.vehicle_bookings (id, listing_id, buyer_id, seller_id, kind, starts_at, ends_at, status)
values ('71000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', tests.id('cliente2'), tests.id('privato'), 'visione', now() + interval '20 hours', now() + interval '21 hours', 'confermato');
select private.process_booking_reminders();
select private.process_booking_reminders();
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente2') and title = 'Promemoria: appuntamento domani') = 1, 'promemoria 24 h inviato una sola volta');
update public.vehicle_bookings set starts_at = now() + interval '90 minutes', ends_at = now() + interval '150 minutes' where id = '71000000-0000-0000-0000-000000000001';
select private.process_booking_reminders();
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente2') and title = 'Promemoria: appuntamento tra meno di 2 ore') = 1, 'promemoria 2 h');
rollback;

select '=== TEST FASI 21, 22, 27 SUPERATI ===';

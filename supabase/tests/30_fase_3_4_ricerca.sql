-- =====================================================================
-- Test migrazione 0016: vista di ricerca, campi di sistema, nomi interlocutori
-- (eseguito dopo 20_fasi_3_10.sql, riusa i suoi dati di prova)
-- =====================================================================
\set ON_ERROR_STOP on

begin;
select tests.as_anon();
select tests.expect((select count(*) from public.listing_search where status = 'pubblicato') >= 1, 'la vista di ricerca restituisce gli annunci pubblicati');
select tests.expect((select count(*) from public.listing_search where status not in ('pubblicato', 'venduto')) = 0, 'la vista non espone bozze o annunci in revisione ai visitatori');
select tests.expect((select neo_result is not null from public.listing_search where id = '30000000-0000-0000-0000-000000000001'),
  'la vista include l''esito neopatentati per il filtro');
select tests.expect((select count(*) from public.listing_search where neo_result = 'compatibile' and status = 'pubblicato')
                    = (select count(*) from public.vehicle_listings where neo_result = 'compatibile' and status = 'pubblicato'),
  'il filtro "solo compatibili" coincide con lo stato degli annunci');
rollback;

begin;
select tests.as_user(tests.id('cliente2'));
insert into public.vehicles (id, owner_id, make_slug, make_name, model, year, mileage_km, fuel, transmission, power_kw, tare_kg)
values ('20000000-0000-0000-0000-000000000099', tests.id('cliente2'), 'fiat', 'Fiat', '500', 2020, 30000, 'benzina', 'manuale', 51, 940);
insert into public.vehicle_listings (id, vehicle_id, owner_id, title, slug, approved_at, published_at, view_count, admin_suspended, neo_result)
values ('30000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000099', tests.id('cliente2'), 'Fiat 500 prova', '',
        now(), now(), 999, true, 'compatibile');
select tests.expect((select approved_at is null and published_at is null and view_count = 0 and not admin_suspended
                     from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000099'),
  'i campi di moderazione impostati dal client vengono azzerati alla creazione');
select tests.expect((select slug <> '' from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000099'), 'slug generato automaticamente');
select tests.expect((select neo_result from public.vehicle_listings where id = '30000000-0000-0000-0000-000000000099') = 'compatibile',
  'l''esito neopatentati è ricalcolato dal sistema (non quello inviato dal client)');
select tests.expect_error($$update public.vehicle_listings set status = 'pubblicato' where id = '30000000-0000-0000-0000-000000000099'$$,
  'una bozza non può essere pubblicata senza revisione anche se il client aveva inviato approved_at');
rollback;

begin;
select tests.as_user(tests.id('cliente'));
select tests.expect((select display_name from public.counterpart_names(array[tests.id('privato')])) = 'Privato',
  'nome ridotto dell''interlocutore con cui esiste una richiesta');
select tests.expect((select count(*) from public.counterpart_names(array[tests.id('moderatore')])) = 0,
  'nessun nome per utenti senza richieste o conversazioni in comune');
select tests.expect((select count(*) from public.counterpart_names(array[tests.id('privato')]) where display_name like '%@%') = 0,
  'mai email tra i nomi restituiti');
rollback;
begin;
select tests.as_anon();
select tests.expect_error($$select * from public.counterpart_names(array['10000000-0000-0000-0000-000000000003'::uuid])$$, 'i visitatori non possono interrogare i nomi');
rollback;

-- Privacy indirizzo e coordinate dei professionisti
begin; select tests.as_service();
update public.professional_profiles set address_line = 'Via Privata 1', latitude = 45.46789, longitude = 9.18765, show_address = false,
  work_modes = '{mobile}', city = 'Milano', is_published = true, review_status = 'approvato'
 where id = tests.id('pp_meccanico');
commit;
begin;
select tests.as_anon();
select tests.expect_error($$select address_line from public.professional_profiles limit 1$$, 'l''indirizzo non è leggibile direttamente dall''API');
select tests.expect_error($$select latitude from public.professional_profiles limit 1$$, 'le coordinate esatte non sono leggibili direttamente');
select tests.expect((select address_line is null and latitude = 45.47 and approximate from public.professional_locations(array[tests.id('pp_meccanico')])),
  'per chi non mostra l''indirizzo: nessun indirizzo e coordinate arrotondate');
select tests.expect((select latitude from public.search_professionals('meccanico') where id = tests.id('pp_meccanico')) = 45.47,
  'anche la ricerca restituisce coordinate arrotondate');
rollback;
begin;
select tests.as_user(tests.id('meccanico'));
select tests.expect((select address_line from public.professional_private_details(tests.id('pp_meccanico'))) = 'Via Privata 1', 'il titolare legge il proprio indirizzo');
rollback;
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.professional_private_details(tests.id('pp_meccanico'))) = 0, 'un altro utente non legge i dati privati');
rollback;

-- Attivazione profilo professionale da parte di un cliente
begin;
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select public.become_professional('admin', 'Prova')$$, 'non si possono auto-assegnare ruoli di staff');
select public.become_professional('officina', 'Officina Prova Bicocca');
select tests.expect((select review_status = 'bozza' and not is_published from public.professional_profiles where user_id = tests.id('cliente2') and professional_type = 'officina'),
  'il nuovo profilo professionale nasce in bozza e non è pubblico');
select tests.expect((select public.become_professional('officina', 'Altro nome')) = (select id from public.professional_profiles where user_id = tests.id('cliente2') and professional_type = 'officina'),
  'un solo profilo per tipologia');
select tests.expect(exists (select 1 from public.user_roles where user_id = tests.id('cliente2') and role = 'officina'), 'ruolo professionale assegnato');
rollback;

-- Ricambi: campi di sistema e base di compatibilità
begin;
select tests.as_user(tests.id('ricambista'));
insert into public.part_listings (id, owner_id, title, slug, approved_at, view_count, price_cents, city, description, manufacturer_brand, category_id)
select '70000000-0000-0000-0000-000000000099', tests.id('ricambista'), 'Pastiglie freno prova', '', now(), 500, 2500, 'Milano', 'Pastiglie anteriori', 'Brembo', id from public.part_categories where slug = 'freni';
select tests.expect((select approved_at is null and view_count = 0 from public.part_listings where id = '70000000-0000-0000-0000-000000000099'),
  'ricambi: i campi di moderazione inviati dal client sono azzerati');
insert into public.part_compatibility (part_id, make_slug, model, basis) values ('70000000-0000-0000-0000-000000000099', 'fiat', 'Panda', 'codice_oem');
select tests.expect_error($$insert into public.part_compatibility (part_id, make_slug, model, basis) values ('70000000-0000-0000-0000-000000000099', 'fiat', 'Panda', 'catalogo_produttore')$$,
  'il venditore non può dichiarare da solo la corrispondenza con il catalogo del produttore');
select tests.expect_error($$insert into public.part_compatibility (part_id, make_slug, model, year_from, year_to) values ('70000000-0000-0000-0000-000000000099', 'fiat', 'Panda', 2020, 2010)$$,
  'intervallo di anni incoerente rifiutato');
rollback;

-- Ricerca ricambi
begin;
select tests.as_anon();
select tests.expect((select count(*) from public.search_parts()) = (select count(*) from public.part_listings where status in ('pubblicato', 'esaurito')),
  'la ricerca ricambi mostra solo prodotti pubblicati (o esauriti)');
select tests.expect(not exists (select 1 from public.search_parts() where status not in ('pubblicato', 'esaurito')), 'nessuna bozza nei risultati');
select tests.expect((select exact_code from public.search_parts(p_query => '7736-5555', p_sort => 'rilevanza') limit 1), 'codice OEM scritto con separatori trovato e messo per primo');
select tests.expect((select count(*) from public.search_parts(p_make => 'fiat', p_model => 'Panda', p_year => 2018)) >= 1, 'ricerca per automobile (marca, modello, anno)');
select tests.expect((select count(*) from public.search_parts(p_make => 'fiat', p_model => 'Panda', p_year => 2008)) = 0, 'fuori dagli anni di compatibilità nessun risultato');
rollback;

-- CMS: bozze non pubbliche
begin;
select tests.as_anon();
select tests.expect_error($$select draft from public.site_content limit 1$$, 'le bozze del CMS non sono leggibili dal pubblico');
select tests.expect((select count(*) from public.site_content where published is not null) >= 1, 'i contenuti pubblicati restano visibili');
rollback;
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select * from public.admin_content_list()$$, 'un cliente non legge le bozze');
rollback;
begin;
select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.admin_content_list()) >= 8, 'lo staff autorizzato legge bozze e contenuti');
rollback;

\echo '=== TEST MIGRAZIONE 0016 SUPERATI ==='

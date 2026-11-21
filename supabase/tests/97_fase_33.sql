-- =====================================================================
-- Test migrazione 0027 (Fase 33): SEO Engine
-- =====================================================================
\set ON_ERROR_STOP on

begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$insert into public.blog_articles (slug, title, author_name) values ('prova', 'Articolo di prova lungo', 'Redazione')$$, 'solo lo staff scrive articoli');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/vecchia', '/nuova')$$, 'solo lo staff crea redirect');
select tests.expect_error($$select * from public.admin_seo_checks()$$, 'controlli SEO riservati');

select tests.as_user(tests.id('admin'));
insert into public.blog_categories (slug, name) values ('guide', 'Guide');
insert into public.blog_articles (slug, title, author_name, status, content, category_id)
values ('bozza-revisione', 'Come prepararsi alla revisione', 'Redazione AutoGarage24', 'bozza', 'Testo breve', (select id from public.blog_categories where slug = 'guide'));
select tests.expect_error($$update public.blog_articles set status = 'pubblicato' where slug = 'bozza-revisione'$$, 'non si pubblica un articolo troppo corto');
update public.blog_articles set content = repeat('Contenuto reale dell''articolo sulla revisione. ', 10), status = 'pubblicato' where slug = 'bozza-revisione';
insert into public.blog_articles (slug, title, author_name, status, content, publish_at)
values ('futuro', 'Articolo programmato per domani', 'Redazione', 'programmato', repeat('Testo programmato. ', 30), now() + interval '1 day'),
       ('passato', 'Articolo programmato già uscito', 'Redazione', 'programmato', repeat('Testo programmato. ', 30), now() - interval '1 hour');
select tests.expect_error($$insert into public.blog_articles (slug, title, author_name, status, content) values ('senza-data', 'Programmato senza data', 'Redazione', 'programmato', repeat('x', 400))$$, 'programmazione senza data rifiutata');
select tests.as_anon();
select tests.expect((select count(*) from public.blog_articles) = 2, 'pubblico: articoli pubblicati e programmati già usciti');
select tests.expect((select count(*) from public.blog_articles where slug = 'futuro') = 0, 'articolo programmato non ancora visibile');

-- Redirect: niente catene, cicli, aree riservate
select tests.as_user(tests.id('admin'));
insert into public.seo_redirects (from_path, to_path) values ('/vecchia-pagina', '/auto-usate');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/altra', '/vecchia-pagina')$$, 'nessuna catena di redirect');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/auto-usate', '/x')$$, 'nessuna origine che è già destinazione');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/admin/utenti', '/')$$, 'aree riservate escluse');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/x', '//evil.example')$$, 'destinazione non sicura rifiutata');
select tests.expect_error($$insert into public.seo_redirects (from_path, to_path) values ('/x', 'javascript:alert(1)')$$, 'schema non ammesso');
insert into public.seo_redirects (from_path, to_path, active) values ('/disattivato', '/garages', false);
select tests.as_anon();
select tests.expect((select count(*) from public.seo_redirects) = 1, 'il pubblico vede solo i redirect attivi');

-- Override meta
select tests.as_user(tests.id('admin'));
select tests.expect_error($$insert into public.seo_overrides (path, title) values ('/garages', 'corto')$$, 'titolo troppo corto rifiutato');
insert into public.seo_overrides (path, title, description) values ('/garages', 'Officine verificate a Milano | AutoGarage24', 'Trova officine e meccanici verificati a Milano: orari, servizi, recensioni verificate e preventivi gratuiti.');

-- Pagine locali: indicizzabili solo con contenuti reali sufficienti
reset role;
set local session_replication_role = replica;
update public.professional_profiles set is_published = true, review_status = 'approvato', city = 'Milano' where id = tests.id('pp_officina');
set local session_replication_role = origin;
select tests.as_anon();
select tests.expect((select profiles >= 1 from public.seo_local_pages() where city_slug = 'milano' and professional_type = 'officina'), 'pagina locale con profili reali');
select tests.expect((select bool_and(indexable = (profiles >= 3)) from public.seo_local_pages()), 'indicizzabile solo con almeno 3 profili pubblicati');
select tests.expect((select count(*) from public.seo_local_pages() where city_slug !~ '^[a-z0-9-]+$') = 0, 'slug città puliti');
select tests.expect((select count(*) = 4 from public.seo_neo_bands()), 'quattro fasce di prezzo neopatentati');
select tests.expect((select bool_and(not indexable) from public.seo_neo_bands()), 'senza annunci compatibili nessuna fascia è indicizzabile');

select tests.as_user(tests.id('admin'));
select tests.expect((select count(*) from public.admin_seo_checks() where area = 'professionisti') >= 1, 'controllo: profilo con descrizione breve');
rollback;

select '=== TEST FASE 33 SUPERATI ===';

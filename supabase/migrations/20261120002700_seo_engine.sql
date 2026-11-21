-- =====================================================================
-- Migrazione 0027 — Fase 33: SEO Engine
--  * blog/redazione: categorie, articoli (bozze, programmazione, anteprima per lo staff);
--  * meta per pagina (override di titolo, descrizione, canonical, noindex);
--  * redirect 301/302 gestiti dal pannello;
--  * conteggi per le pagine locali (indicizzabili solo con contenuti reali sufficienti);
--  * controlli di qualità SEO.
-- =====================================================================

insert into public.role_permissions (role, permission)
select r::public.app_role, 'seo.manage' from unnest(array['admin', 'super_admin']) r on conflict do nothing;

insert into public.platform_settings (key, value, description) values
  ('seo_local_min_profiles', '3', 'Profili pubblicati necessari perché una pagina locale (città + categoria) sia indicizzabile.'),
  ('seo_neo_min_listings', '6', 'Annunci compatibili necessari perché una pagina neopatentati per fascia di prezzo sia indicizzabile.'),
  ('seo_robots_extra_disallow', '[]', 'Percorsi aggiuntivi esclusi in robots.txt (elenco JSON di percorsi che iniziano con /).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------
create table public.blog_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  name         text not null check (char_length(name) between 3 and 60),
  description  text check (char_length(description) <= 300),
  sort         integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.blog_articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 90),
  title            text not null check (char_length(title) between 10 and 110),
  excerpt          text check (char_length(excerpt) <= 300),
  content          text not null default '' check (char_length(content) <= 60000),
  category_id      uuid references public.blog_categories (id) on delete set null,
  author_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  author_name      text not null check (char_length(author_name) between 2 and 80),
  cover_path       text check (char_length(cover_path) <= 300),
  cover_alt        text check (char_length(cover_alt) <= 160),
  meta_title       text check (char_length(meta_title) <= 70),
  meta_description text check (char_length(meta_description) <= 160),
  status           text not null default 'bozza' check (status in ('bozza', 'programmato', 'pubblicato', 'archiviato')),
  publish_at       timestamptz,
  published_at     timestamptz,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (status <> 'programmato' or publish_at is not null),
  check (status not in ('programmato', 'pubblicato') or char_length(content) >= 300)
);
create index blog_articles_public_idx on public.blog_articles (status, publish_at desc);
create trigger blog_articles_updated before update on public.blog_articles for each row execute function private.set_updated_at();

create or replace function private.blog_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then new.author_id := old.author_id; end if;
  if new.status = 'pubblicato' and (tg_op = 'INSERT' or old.status <> 'pubblicato') then
    new.published_at := coalesce(new.publish_at, now()); new.publish_at := coalesce(new.publish_at, now());
  elsif new.status = 'programmato' then new.published_at := new.publish_at;
  end if;
  return new;
end;
$$;
create trigger blog_articles_before_write before insert or update on public.blog_articles for each row execute function private.blog_before_write();

-- Articolo visibile al pubblico: pubblicato, oppure programmato con data raggiunta.
create or replace function private.blog_is_live(_status text, _publish_at timestamptz)
returns boolean language sql stable set search_path = ''
as $$ select _status = 'pubblicato' or (_status = 'programmato' and _publish_at <= now()); $$;

-- ---------------------------------------------------------------------
-- Meta per pagina e redirect
-- ---------------------------------------------------------------------
create table public.seo_overrides (
  path         text primary key check (path ~ '^/[a-z0-9/_-]{0,199}$'),
  title        text check (char_length(title) between 10 and 70),
  description  text check (char_length(description) between 50 and 160),
  canonical    text check (canonical ~ '^/[a-z0-9/_-]{0,199}$'),
  noindex      boolean not null default false,
  note         text check (char_length(note) <= 300),
  updated_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at   timestamptz not null default now()
);
create trigger seo_overrides_updated before update on public.seo_overrides for each row execute function private.set_updated_at();

create table public.seo_redirects (
  id           uuid primary key default gen_random_uuid(),
  from_path    text not null unique check (from_path ~ '^/[a-z0-9/_.-]{1,199}$' and from_path !~ '^/(admin|dashboard|business|api|auth|_next)(/|$)'),
  to_path      text not null check ((to_path ~ '^/[a-z0-9/_?=&.-]{0,199}$' and to_path !~ '^//') or to_path ~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/[A-Za-z0-9/_?=&.-]*)?$'),
  status_code  integer not null default 301 check (status_code in (301, 302, 308)),
  active       boolean not null default true,
  note         text check (char_length(note) <= 300),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  check (from_path <> to_path)
);

-- Niente catene né cicli: la destinazione non può essere a sua volta un'origine attiva, e viceversa.
create or replace function private.seo_redirect_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.from_path := lower(rtrim(new.from_path, '/'));
  if new.from_path = '' then raise exception 'La home non può essere reindirizzata' using errcode = '22023'; end if;
  if new.active and exists (select 1 from public.seo_redirects r where r.active and r.id <> new.id and r.from_path = split_part(new.to_path, '?', 1)) then
    raise exception 'La destinazione è già reindirizzata altrove: punta direttamente alla pagina finale' using errcode = '22023';
  end if;
  if new.active and exists (select 1 from public.seo_redirects r where r.active and r.id <> new.id and split_part(r.to_path, '?', 1) = new.from_path) then
    raise exception 'Un altro redirect punta a questa origine: aggiorna prima quello (evita catene)' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger seo_redirects_guard before insert or update on public.seo_redirects for each row execute function private.seo_redirect_guard();

-- ---------------------------------------------------------------------
-- Pagine locali e neopatentati: conteggi reali
-- ---------------------------------------------------------------------
create or replace function public.seo_local_pages()
returns table (city_slug text, city text, professional_type text, profiles bigint, indexable boolean)
language sql stable security definer set search_path = ''
as $$
  select lower(regexp_replace(translate(pp.city, 'àèéìòùÀÈÉÌÒÙ''', 'aeeiouAEEIOU-'), '[^A-Za-z0-9]+', '-', 'g')) as city_slug,
         min(pp.city), pp.professional_type::text, count(*),
         count(*) >= coalesce((private.setting('seo_local_min_profiles'))::text::integer, 3)
  from public.professional_profiles pp
  where pp.is_published and pp.review_status = 'approvato' and pp.deleted_at is null and pp.city is not null
    and pp.professional_type::text in ('officina', 'meccanico', 'venditore_ricambi', 'venditore_auto')
  group by 1, 3;
$$;

create or replace function public.seo_neo_bands()
returns table (band text, listings bigint, indexable boolean)
language sql stable security definer set search_path = ''
as $$
  select b.band, count(l.id),
         count(l.id) >= coalesce((private.setting('seo_neo_min_listings'))::text::integer, 6)
  from (values ('fino-5000', 0, 500000), ('5000-10000', 500000, 1000000), ('10000-15000', 1000000, 1500000), ('oltre-15000', 1500000, 1000000000000)) b(band, lo, hi)
  left join public.listing_search l on l.status = 'pubblicato' and l.neo_result = 'compatibile' and l.price_cents >= b.lo and l.price_cents < b.hi
  group by b.band, b.lo order by b.lo;
$$;

-- ---------------------------------------------------------------------
-- Controlli di qualità (solo staff)
-- ---------------------------------------------------------------------
create or replace function public.admin_seo_checks()
returns table (area text, severity text, item text, link text, issue text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('seo.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return query
  select 'annunci', 'media', l.title, '/auto/' || l.slug, 'Annuncio pubblicato senza fotografie'
    from public.vehicle_listings l where l.status = 'pubblicato' and not exists (select 1 from public.vehicle_images i where i.listing_id = l.id)
  union all
  select 'annunci', 'bassa', l.title, '/auto/' || l.slug, 'Descrizione assente o molto breve (meno di 80 caratteri)'
    from public.vehicle_listings l where l.status = 'pubblicato' and coalesce(char_length(l.description), 0) < 80
  union all
  select 'professionisti', 'media', pp.display_name, '/dashboard/profilo-professionale', 'Profilo pubblicato con descrizione breve: non indicizzato finché non viene completato'
    from public.professional_profiles pp where pp.is_published and pp.deleted_at is null and coalesce(char_length(pp.description), 0) < 120
  union all
  select 'professionisti', 'bassa', pp.display_name, '/dashboard/profilo-professionale', 'Città non indicata: il profilo non compare nelle pagine locali'
    from public.professional_profiles pp where pp.is_published and pp.deleted_at is null and pp.city is null
  union all
  select 'blog', 'media', a.title, '/admin/seo?tab=articoli&id=' || a.id, 'Meta description mancante'
    from public.blog_articles a where private.blog_is_live(a.status, a.publish_at) and a.meta_description is null and a.excerpt is null
  union all
  select 'blog', 'media', a.title, '/admin/seo?tab=articoli&id=' || a.id, 'Immagine di copertina senza testo alternativo'
    from public.blog_articles a where private.blog_is_live(a.status, a.publish_at) and a.cover_path is not null and a.cover_alt is null
  union all
  select 'blog', 'bassa', a.title, '/admin/seo?tab=articoli&id=' || a.id, 'Articolo senza categoria'
    from public.blog_articles a where private.blog_is_live(a.status, a.publish_at) and a.category_id is null
  union all
  select 'landing', 'bassa', lp.title, '/admin/growth?tab=landing&id=' || lp.id, 'Landing indicizzabile senza meta description'
    from public.landing_pages lp where lp.status = 'pubblicata' and lp.indexable and lp.meta_description is null
  union all
  select 'meta', 'alta', o.path, '/admin/seo?tab=meta', 'Pagina esclusa dall''indice (noindex) tramite override: verifica che sia voluto'
    from public.seo_overrides o where o.noindex;
end;
$$;

-- ---------------------------------------------------------------------
-- Storage copertine blog (pubblico in lettura, scrittura solo staff SEO)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "blog-images: caricamento staff" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images' and private.has_permission('seo.manage') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "blog-images: eliminazione staff" on storage.objects for delete to authenticated
  using (bucket_id = 'blog-images' and private.has_permission('seo.manage'));

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.blog_categories enable row level security;
alter table public.blog_articles enable row level security;
alter table public.seo_overrides enable row level security;
alter table public.seo_redirects enable row level security;
revoke all on public.blog_categories, public.blog_articles, public.seo_overrides, public.seo_redirects from anon, authenticated;
grant all on public.blog_categories, public.blog_articles, public.seo_overrides, public.seo_redirects to service_role;

grant select on public.blog_categories, public.blog_articles, public.seo_overrides, public.seo_redirects to anon, authenticated;
create policy "blog_categories: lettura" on public.blog_categories for select to anon, authenticated using (true);
create policy "blog_articles: pubblici" on public.blog_articles for select to anon, authenticated using (private.blog_is_live(status, publish_at));
create policy "blog_articles: staff" on public.blog_articles for select to authenticated using (private.has_permission('seo.manage'));
create policy "seo_overrides: lettura" on public.seo_overrides for select to anon, authenticated using (true);
create policy "seo_redirects: attivi" on public.seo_redirects for select to anon, authenticated using (active);
create policy "seo_redirects: staff" on public.seo_redirects for select to authenticated using (private.has_permission('seo.manage'));

grant insert (slug, name, description, sort), update (slug, name, description, sort), delete on public.blog_categories to authenticated;
grant insert (slug, title, excerpt, content, category_id, author_name, cover_path, cover_alt, meta_title, meta_description, status, publish_at),
      update (slug, title, excerpt, content, category_id, author_name, cover_path, cover_alt, meta_title, meta_description, status, publish_at) on public.blog_articles to authenticated;
grant insert (path, title, description, canonical, noindex, note), update (title, description, canonical, noindex, note), delete on public.seo_overrides to authenticated;
grant insert (from_path, to_path, status_code, active, note), update (to_path, status_code, active, note), delete on public.seo_redirects to authenticated;

create policy "blog_categories: staff scrive" on public.blog_categories for insert to authenticated with check (private.has_permission('seo.manage'));
create policy "blog_categories: staff modifica" on public.blog_categories for update to authenticated using (private.has_permission('seo.manage')) with check (private.has_permission('seo.manage'));
create policy "blog_categories: staff elimina" on public.blog_categories for delete to authenticated using (private.has_permission('seo.manage'));
create policy "blog_articles: staff scrive" on public.blog_articles for insert to authenticated with check (private.has_permission('seo.manage'));
create policy "blog_articles: staff modifica" on public.blog_articles for update to authenticated using (private.has_permission('seo.manage')) with check (private.has_permission('seo.manage'));
create policy "seo_overrides: staff scrive" on public.seo_overrides for insert to authenticated with check (private.has_permission('seo.manage'));
create policy "seo_overrides: staff modifica" on public.seo_overrides for update to authenticated using (private.has_permission('seo.manage')) with check (private.has_permission('seo.manage'));
create policy "seo_overrides: staff elimina" on public.seo_overrides for delete to authenticated using (private.has_permission('seo.manage'));
create policy "seo_redirects: staff scrive" on public.seo_redirects for insert to authenticated with check (private.has_permission('seo.manage'));
create policy "seo_redirects: staff modifica" on public.seo_redirects for update to authenticated using (private.has_permission('seo.manage')) with check (private.has_permission('seo.manage'));
create policy "seo_redirects: staff elimina" on public.seo_redirects for delete to authenticated using (private.has_permission('seo.manage'));

revoke all on function public.seo_local_pages(), public.seo_neo_bands() from public;
grant execute on function public.seo_local_pages(), public.seo_neo_bands() to anon, authenticated;
revoke all on function public.admin_seo_checks() from public, anon;
grant execute on function public.admin_seo_checks() to authenticated;

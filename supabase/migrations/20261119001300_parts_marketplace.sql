-- =====================================================================
-- AutoGarage24 — Migrazione 0013 (Fase 7): marketplace ricambi
-- Tabelle: part_categories, part_listings, part_images, part_compatibility
-- =====================================================================

create type public.part_condition as enum ('nuovo', 'usato', 'ricondizionato');
create type public.part_status as enum ('bozza', 'in_revisione', 'approvato', 'pubblicato', 'rifiutato', 'sospeso', 'esaurito', 'venduto', 'scaduto');

create table public.part_categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.part_categories (id) on delete restrict,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 2 and 80),
  position   integer not null default 0,
  active     boolean not null default true
);
create index part_categories_parent_idx on public.part_categories (parent_id, position);

insert into public.part_categories (slug, name, position) values
  ('motore','Motore',1), ('cambio-trasmissione','Cambio e trasmissione',2), ('freni','Freni',3), ('sospensioni','Sospensioni',4),
  ('sterzo','Sterzo',5), ('elettronica','Elettronica',6), ('batteria','Batteria',7), ('illuminazione','Illuminazione',8),
  ('carrozzeria','Carrozzeria',9), ('interni','Interni',10), ('climatizzazione','Climatizzazione',11), ('raffreddamento','Raffreddamento',12),
  ('scarico','Scarico',13), ('filtri','Filtri',14), ('frizione','Frizione',15), ('pneumatici-cerchi','Pneumatici e cerchi',16),
  ('accessori','Accessori',17), ('componenti-elettrici','Componenti elettrici',18);

insert into public.part_categories (parent_id, slug, name, position)
select p.id, x.slug, x.name, x.pos from public.part_categories p
join (values
  ('freni','pastiglie-freno','Pastiglie freno',1), ('freni','dischi-freno','Dischi freno',2), ('freni','pinze-freno','Pinze freno',3),
  ('filtri','filtro-olio','Filtro olio',1), ('filtri','filtro-aria','Filtro aria',2), ('filtri','filtro-abitacolo','Filtro abitacolo',3),
  ('filtri','filtro-carburante','Filtro carburante',4), ('motore','cinghia-distribuzione','Kit distribuzione',1),
  ('motore','candele','Candele e candelette',2), ('illuminazione','fari','Fari',1), ('illuminazione','lampadine','Lampadine',2),
  ('carrozzeria','paraurti','Paraurti',1), ('carrozzeria','specchietti','Specchietti',2),
  ('sospensioni','ammortizzatori','Ammortizzatori',1), ('raffreddamento','radiatori','Radiatori',1)
) as x(parent, slug, name, pos) on p.slug = x.parent;

create table public.part_listings (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references public.profiles (id) on delete cascade,
  professional_profile_id  uuid references public.professional_profiles (id) on delete set null,
  seller_kind              public.seller_kind not null default 'privato',
  slug                     text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                    text not null check (char_length(title) between 3 and 140),
  category_id              uuid not null references public.part_categories (id) on delete restrict,
  manufacturer_brand       text check (char_length(manufacturer_brand) <= 80),
  oem_code                 text check (char_length(oem_code) <= 60),
  manufacturer_code        text check (char_length(manufacturer_code) <= 60),
  oem_code_norm            text generated always as (upper(regexp_replace(coalesce(oem_code, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  manufacturer_code_norm   text generated always as (upper(regexp_replace(coalesce(manufacturer_code, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  description              text check (char_length(description) <= 5000),
  condition                public.part_condition not null default 'nuovo',
  refurbishment_notes      text check (char_length(refurbishment_notes) <= 2000),
  price_cents              bigint check (price_cents > 0 and price_cents < 10000000000),
  quantity                 integer check (quantity >= 0 and quantity <= 100000),
  delivery_options         text[] not null default '{}' check (delivery_options <@ array['ritiro','spedizione','consegna_locale']),
  warranty_text            text check (char_length(warranty_text) <= 500),
  city                     text check (char_length(city) <= 80),
  postal_code              text check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  province                 text check (char_length(province) <= 40),
  latitude                 double precision check (latitude between -90 and 90),
  longitude                double precision check (longitude between -180 and 180),
  status                   public.part_status not null default 'bozza',
  status_note              text check (char_length(status_note) <= 1000),
  approved_by              uuid references public.profiles (id) on delete set null,
  approved_at              timestamptz,
  published_at             timestamptz,
  expires_at               timestamptz,
  declared_accuracy_at     timestamptz,
  declared_photo_rights_at timestamptz,
  accepted_terms_at        timestamptz,
  view_count               integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint part_listings_refurbished check (condition <> 'ricondizionato' or coalesce(refurbishment_notes, '') <> '')
);
comment on column public.part_listings.refurbishment_notes is 'Obbligatorio per i ricambi ricondizionati: descrizione del processo.';
create index part_listings_status_idx on public.part_listings (status, published_at desc);
create index part_listings_category_idx on public.part_listings (category_id) where status = 'pubblicato';
create index part_listings_oem_idx on public.part_listings (oem_code_norm) where status = 'pubblicato';
create index part_listings_mfr_idx on public.part_listings (manufacturer_code_norm) where status = 'pubblicato';
create index part_listings_owner_idx on public.part_listings (owner_id, updated_at desc);
create trigger part_listings_set_updated_at before update on public.part_listings for each row execute function private.set_updated_at();

alter table public.requests add constraint requests_part_fk foreign key (part_id) references public.part_listings (id) on delete set null;
alter table public.favorites add constraint favorites_part_fk foreign key (part_id) references public.part_listings (id) on delete cascade;

create table public.part_images (
  id            uuid primary key default gen_random_uuid(),
  part_id       uuid not null references public.part_listings (id) on delete cascade,
  storage_path  text not null unique check (char_length(storage_path) <= 400),
  position      integer not null default 0,
  is_cover      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index part_images_part_idx on public.part_images (part_id, position);
create unique index part_images_one_cover_idx on public.part_images (part_id) where is_cover;

-- Compatibilità DICHIARATA dal venditore, con base documentale.
create table public.part_compatibility (
  id             uuid primary key default gen_random_uuid(),
  part_id        uuid not null references public.part_listings (id) on delete cascade,
  make_slug      text not null check (make_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  model          text not null check (char_length(model) between 1 and 80),
  generation     text check (char_length(generation) <= 60),
  version        text check (char_length(version) <= 120),
  year_from      integer check (year_from between 1950 and 2100),
  year_to        integer check (year_to between 1950 and 2100),
  engine         text check (char_length(engine) <= 80),
  engine_code    text check (char_length(engine_code) <= 40),
  oem_reference  text check (char_length(oem_reference) <= 60),
  basis          text not null default 'dichiarazione_venditore'
                   check (basis in ('dichiarazione_venditore', 'codice_oem', 'catalogo_produttore')),
  notes          text check (char_length(notes) <= 500),
  check (year_to is null or year_from is null or year_to >= year_from)
);
create index part_compatibility_lookup_idx on public.part_compatibility (make_slug, lower(model));

create or replace function private.owns_part(_part_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.part_listings where id = _part_id and owner_id = (select auth.uid())); $$;
create or replace function private.part_is_public(_part_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.part_listings p where p.id = _part_id and p.status in ('pubblicato', 'esaurito')
                       and private.is_user_active(p.owner_id)); $$;
grant execute on function private.owns_part(uuid), private.part_is_public(uuid) to anon, authenticated, service_role;

create or replace function private.part_listings_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _pro uuid;
begin
  if new.slug is null or new.slug = '' then new.slug := private.unique_slug(new.title); end if;
  select id into _pro from public.professional_profiles where user_id = new.owner_id and professional_type in ('venditore_ricambi', 'officina') limit 1;
  new.professional_profile_id := _pro;
  new.seller_kind := case when _pro is null then 'privato' else 'professionista' end;
  if _pro is null and (select count(*) from public.part_listings where owner_id = new.owner_id
                        and status in ('bozza', 'in_revisione', 'approvato', 'pubblicato', 'sospeso')) >= 10 then
    raise exception 'Un venditore privato può avere al massimo 10 ricambi attivi' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger part_listings_before_insert before insert on public.part_listings for each row execute function private.part_listings_before_insert();

create or replace function private.part_publication_problems(_p public.part_listings)
returns text[] language plpgsql stable security definer set search_path = ''
as $$
declare _problems text[] := '{}';
begin
  if _p.price_cents is null then _problems := array_append(_problems, 'prezzo'::text); end if;
  if coalesce(_p.description, '') = '' then _problems := array_append(_problems, 'descrizione'::text); end if;
  if _p.city is null then _problems := array_append(_problems, 'città'::text); end if;
  if coalesce(_p.oem_code, _p.manufacturer_code, _p.manufacturer_brand) is null then
    _problems := array_append(_problems, 'marca o codice del ricambio (necessari per identificarlo)'::text);
  end if;
  if not exists (select 1 from public.part_images i where i.part_id = _p.id) then _problems := array_append(_problems, 'fotografie'::text); end if;
  if _p.declared_accuracy_at is null or _p.declared_photo_rights_at is null or _p.accepted_terms_at is null then
    _problems := array_append(_problems, 'dichiarazioni del venditore'::text);
  end if;
  return _problems;
end;
$$;

create or replace function private.part_listings_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _mod boolean := private.has_permission('listings.moderate'); _problems text[];
begin
  if new.owner_id <> old.owner_id then raise exception 'Campi non modificabili' using errcode = '42501'; end if;
  if not _mod and new.status is distinct from old.status then
    if not ((old.status in ('bozza', 'rifiutato', 'scaduto') and new.status = 'in_revisione')
         or (old.status = 'approvato' and new.status = 'pubblicato')
         or (old.status = 'pubblicato' and new.status in ('sospeso', 'esaurito', 'venduto'))
         or (old.status = 'esaurito' and new.status = 'pubblicato')
         or (old.status = 'sospeso' and new.status = 'pubblicato' and old.status_note is null)) then
      raise exception 'Cambio di stato non consentito: % → %', old.status, new.status using errcode = '42501';
    end if;
  end if;
  if not _mod and old.status in ('pubblicato', 'approvato') and new.status = old.status
     and (new.title, new.description, new.category_id, new.oem_code, new.manufacturer_code, new.manufacturer_brand, new.condition)
         is distinct from (old.title, old.description, old.category_id, old.oem_code, old.manufacturer_code, old.manufacturer_brand, old.condition) then
    new.status := 'in_revisione';
  end if;
  if new.status in ('in_revisione', 'pubblicato') and old.status is distinct from new.status then
    _problems := private.part_publication_problems(new);
    if cardinality(_problems) > 0 then
      raise exception 'Annuncio incompleto: %', array_to_string(_problems, ', ') using errcode = '22023';
    end if;
  end if;
  if new.status = 'pubblicato' and old.status is distinct from 'pubblicato' then
    if new.approved_at is null then raise exception 'Annuncio non ancora approvato' using errcode = '42501'; end if;
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := now() + interval '120 days';
  end if;
  return new;
end;
$$;
create trigger part_listings_before_update before update on public.part_listings for each row execute function private.part_listings_before_update();

create or replace function public.admin_moderate_part(part_id uuid, action text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _p public.part_listings%rowtype;
begin
  if not private.has_permission('listings.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  select * into _p from public.part_listings where id = part_id for update;
  if not found then raise exception 'Ricambio non trovato' using errcode = 'P0002'; end if;
  if action in ('rifiuta', 'sospendi') and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  if action = 'approva_pubblica' then
    update public.part_listings set approved_by = auth.uid(), approved_at = now() where id = part_id;
    update public.part_listings set status = 'pubblicato', status_note = note where id = part_id;
  elsif action = 'rifiuta' then
    update public.part_listings set status = 'rifiutato', status_note = note where id = part_id;
  elsif action = 'sospendi' then
    update public.part_listings set status = 'sospeso', status_note = note where id = part_id;
  elsif action = 'riattiva' then
    update public.part_listings set status = 'pubblicato', status_note = null where id = part_id;
  else raise exception 'Azione non valida' using errcode = '22023';
  end if;
  perform private.notify(_p.owner_id, 'ricambi', 'Ricambio: ' || replace(action, '_', ' '), note, '/dashboard/ricambi',
    'part:' || part_id || ':' || action || ':' || to_char(now(), 'YYYYMMDDHH24MI'), 'annuncio_aggiornato');
  perform private.log_admin_action('part.' || action, 'part_listings', part_id::text, jsonb_build_object('from', _p.status, 'note', note));
end;
$$;
revoke all on function public.admin_moderate_part(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_part(uuid, text, text) to authenticated;

create or replace function public.track_part_view(part_slug text)
returns void language sql security definer set search_path = ''
as $$ update public.part_listings set view_count = view_count + 1 where slug = part_slug and status = 'pubblicato'; $$;
grant execute on function public.track_part_view(text) to anon, authenticated;

-- RLS ---------------------------------------------------------------------
alter table public.part_categories enable row level security;
alter table public.part_listings enable row level security;
alter table public.part_images enable row level security;
alter table public.part_compatibility enable row level security;
revoke all on table public.part_categories, public.part_listings, public.part_images, public.part_compatibility from anon, authenticated;
grant all on table public.part_categories, public.part_listings, public.part_images, public.part_compatibility to service_role;

grant select on table public.part_categories to anon, authenticated;
grant insert, update on table public.part_categories to authenticated;
create policy "part_categories: lettura" on public.part_categories for select to anon, authenticated
  using (active or (select private.has_permission('categories.manage')));
create policy "part_categories: gestione" on public.part_categories for insert to authenticated
  with check ((select private.has_permission('categories.manage')));
create policy "part_categories: modifica" on public.part_categories for update to authenticated
  using ((select private.has_permission('categories.manage'))) with check ((select private.has_permission('categories.manage')));

grant select on table public.part_listings to anon, authenticated;
grant insert, delete on table public.part_listings to authenticated;
grant update (title, category_id, manufacturer_brand, oem_code, manufacturer_code, description, condition, refurbishment_notes,
              price_cents, quantity, delivery_options, warranty_text, city, postal_code, province, latitude, longitude, status,
              declared_accuracy_at, declared_photo_rights_at, accepted_terms_at) on table public.part_listings to authenticated;
create policy "part_listings: lettura pubblica" on public.part_listings for select to anon, authenticated
  using (status in ('pubblicato', 'esaurito') and private.is_user_active(owner_id));
create policy "part_listings: titolare" on public.part_listings for select to authenticated using (owner_id = (select auth.uid()));
create policy "part_listings: staff" on public.part_listings for select to authenticated using ((select private.has_permission('listings.moderate')));
create policy "part_listings: creazione" on public.part_listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'bozza' and (select private.is_active_user()));
create policy "part_listings: modifica titolare" on public.part_listings for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_user())) with check (owner_id = (select auth.uid()));
create policy "part_listings: eliminazione bozze" on public.part_listings for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('bozza', 'rifiutato'));

grant select on table public.part_images, public.part_compatibility to anon, authenticated;
grant insert, update, delete on table public.part_images, public.part_compatibility to authenticated;
create policy "part_images: pubbliche" on public.part_images for select to anon, authenticated using (private.part_is_public(part_id));
create policy "part_images: titolare" on public.part_images for all to authenticated
  using (private.owns_part(part_id))
  with check (private.owns_part(part_id) and split_part(storage_path, '/', 1) = (select auth.uid())::text);
create policy "part_images: staff" on public.part_images for select to authenticated using ((select private.has_permission('listings.moderate')));
create policy "part_compatibility: pubblica" on public.part_compatibility for select to anon, authenticated using (private.part_is_public(part_id));
create policy "part_compatibility: titolare" on public.part_compatibility for all to authenticated
  using (private.owns_part(part_id)) with check (private.owns_part(part_id));
create policy "part_compatibility: staff" on public.part_compatibility for select to authenticated
  using ((select private.has_permission('listings.moderate')));

-- Vista di ricerca ricambi
create view public.part_search with (security_invoker = true) as
select p.id, p.slug, p.title, p.category_id, c.slug as category_slug, c.name as category_name, c.parent_id as category_parent_id,
       p.manufacturer_brand, p.oem_code, p.manufacturer_code, p.oem_code_norm, p.manufacturer_code_norm, p.condition,
       p.price_cents, p.quantity, p.city, p.postal_code, p.province, p.latitude, p.longitude, p.seller_kind, p.status,
       p.published_at, p.professional_profile_id,
       coalesce(pp.display_name, 'Venditore privato') as seller_name,
       (select i.storage_path from public.part_images i where i.part_id = p.id order by i.is_cover desc, i.position limit 1) as cover_path,
       lower(p.title || ' ' || coalesce(p.manufacturer_brand, '') || ' ' || coalesce(p.description, '')) as search_text
from public.part_listings p
join public.part_categories c on c.id = p.category_id
left join public.professional_profiles pp on pp.id = p.professional_profile_id;
grant select on public.part_search to anon, authenticated;

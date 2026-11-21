-- =====================================================================
-- AutoGarage24 — Migrazione 0009 (Fase 3): marketplace automobilistico
-- Tabelle: vehicles (dati tecnici), vehicle_listings (annuncio),
--          vehicle_images, vehicle_listing_status_history
-- Vista:   listing_search (ricerca pubblica, security_invoker)
-- =====================================================================

create type public.fuel_type as enum ('benzina', 'diesel', 'gpl', 'metano', 'ibrida', 'ibrida_plugin', 'elettrica', 'altra');
create type public.transmission_type as enum ('manuale', 'automatico', 'altro');
create type public.body_type as enum ('berlina', 'utilitaria', 'suv', 'station_wagon', 'coupe', 'cabrio', 'monovolume', 'furgone', 'altra');
create type public.vehicle_condition as enum ('nuovo', 'usato', 'km0', 'aziendale', 'altro');
create type public.listing_status as enum ('bozza', 'in_revisione', 'approvato', 'pubblicato', 'rifiutato', 'sospeso', 'venduto', 'scaduto');
create type public.seller_kind as enum ('privato', 'professionista');

-- ---------------------------------------------------------------------
-- vehicles: dati tecnici. Contiene anche i campi necessari alla verifica
-- neopatentati (potenza, tara, rapporto documentato, immatricolazione).
-- ---------------------------------------------------------------------
create table public.vehicles (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references public.profiles (id) on delete cascade,
  make_slug                 text not null check (make_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  make_name                 text not null check (char_length(make_name) between 1 and 60),
  model                     text not null check (char_length(model) between 1 and 80),
  version                   text check (char_length(version) <= 120),
  variant_code              text check (char_length(variant_code) <= 60),
  vehicle_category          text not null default 'M1' check (vehicle_category in ('M1', 'N1', 'altro')),
  body_type                 public.body_type,
  fuel                      public.fuel_type,
  transmission              public.transmission_type,
  condition                 public.vehicle_condition not null default 'usato',
  first_registration_date   date check (first_registration_date >= '1950-01-01'),
  year                      integer check (year between 1950 and 2100),
  mileage_km                integer check (mileage_km between 0 and 2000000),
  engine_cc                 integer check (engine_cc between 0 and 10000),
  power_kw                  numeric(6,1) check (power_kw > 0 and power_kw < 2000),
  tare_kg                   integer check (tare_kg between 300 and 10000),
  power_to_tare_documented  numeric(6,2) check (power_to_tare_documented > 0 and power_to_tare_documented < 1000),
  doors                     integer check (doors between 1 and 7),
  seats                     integer check (seats between 1 and 9),
  color                     text check (char_length(color) <= 40),
  consumption_l100          numeric(4,1) check (consumption_l100 > 0 and consumption_l100 < 50),
  consumption_kwh100        numeric(5,1) check (consumption_kwh100 > 0 and consumption_kwh100 < 100),
  co2_g_km                  integer check (co2_g_km between 0 and 1000),
  emission_class            text check (char_length(emission_class) <= 20),
  owners_count              integer check (owners_count between 0 and 50),
  equipment                 text[] not null default '{}' check (cardinality(equipment) <= 80),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on column public.vehicles.power_kw is 'Potenza massima netta in kW (voce P.2 della carta di circolazione).';
comment on column public.vehicles.tare_kg is 'Tara in kg come riportata nella documentazione del veicolo.';
comment on column public.vehicles.power_to_tare_documented is 'Rapporto potenza/tara (kW/t) se riportato nella carta di circolazione.';
comment on column public.vehicles.owners_count is 'Numero di proprietari solo se documentato.';

create index vehicles_make_model_idx on public.vehicles (make_slug, lower(model));
create index vehicles_owner_idx on public.vehicles (owner_id);
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- vehicle_listings: l'annuncio commerciale
-- ---------------------------------------------------------------------
create table public.vehicle_listings (
  id                            uuid primary key default gen_random_uuid(),
  vehicle_id                    uuid not null unique references public.vehicles (id) on delete cascade,
  owner_id                      uuid not null references public.profiles (id) on delete cascade,
  professional_profile_id       uuid references public.professional_profiles (id) on delete set null,
  seller_kind                   public.seller_kind not null default 'privato',
  source                        text not null default 'venditore' check (source in ('venditore', 'field_manager')),
  slug                          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                         text not null check (char_length(title) between 3 and 140),
  price_cents                   bigint check (price_cents > 0 and price_cents < 100000000000),
  currency                      text not null default 'EUR' check (currency = 'EUR'),
  negotiable                    boolean not null default false,
  description                   text check (char_length(description) <= 6000),
  condition_notes               text check (char_length(condition_notes) <= 3000),
  maintenance_notes             text check (char_length(maintenance_notes) <= 3000),
  interventions_notes           text check (char_length(interventions_notes) <= 3000),
  known_defects                 text check (char_length(known_defects) <= 3000),
  extra_info                    text check (char_length(extra_info) <= 3000),
  city                          text check (char_length(city) <= 80),
  postal_code                   text check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  province                      text check (char_length(province) <= 40),
  region                        text check (char_length(region) <= 40),
  latitude                      double precision check (latitude between -90 and 90),
  longitude                     double precision check (longitude between -180 and 180),
  status                        public.listing_status not null default 'bozza',
  status_note                   text check (char_length(status_note) <= 1000),
  owner_suspended               boolean not null default false,
  admin_suspended               boolean not null default false,
  approved_by                   uuid references public.profiles (id) on delete set null,
  approved_at                   timestamptz,
  published_at                  timestamptz,
  expires_at                    timestamptz,
  sold_at                       timestamptz,
  declared_accuracy_at          timestamptz,
  declared_availability_at      timestamptz,
  declared_right_to_publish_at  timestamptz,
  declared_photo_rights_at      timestamptz,
  accepted_terms_at             timestamptz,
  view_count                    integer not null default 0,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
comment on table public.vehicle_listings is
  'Annunci auto. Pubblici solo con stato "pubblicato" dopo approvazione amministrativa.';

create index vehicle_listings_status_idx on public.vehicle_listings (status, published_at desc);
create index vehicle_listings_price_idx on public.vehicle_listings (price_cents) where status = 'pubblicato';
create index vehicle_listings_city_idx on public.vehicle_listings (lower(city)) where status = 'pubblicato';
create index vehicle_listings_owner_idx on public.vehicle_listings (owner_id, updated_at desc);
create index vehicle_listings_pro_idx on public.vehicle_listings (professional_profile_id) where status = 'pubblicato';
create trigger vehicle_listings_set_updated_at before update on public.vehicle_listings for each row execute function private.set_updated_at();

create table public.vehicle_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.vehicle_listings (id) on delete cascade,
  storage_path  text not null unique check (char_length(storage_path) <= 400),
  position      integer not null default 0 check (position between 0 and 100),
  is_cover      boolean not null default false,
  width         integer check (width > 0),
  height        integer check (height > 0),
  created_at    timestamptz not null default now()
);
create index vehicle_images_listing_idx on public.vehicle_images (listing_id, position);
create unique index vehicle_images_one_cover_idx on public.vehicle_images (listing_id) where is_cover;

create table public.vehicle_listing_status_history (
  id           bigint generated always as identity primary key,
  listing_id   uuid not null references public.vehicle_listings (id) on delete cascade,
  from_status  public.listing_status,
  to_status    public.listing_status not null,
  actor_id     uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index vehicle_listing_status_history_idx on public.vehicle_listing_status_history (listing_id, created_at desc);

-- ---------------------------------------------------------------------
-- Funzioni di supporto
-- ---------------------------------------------------------------------
create or replace function private.listing_is_public(_listing_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.vehicle_listings l
                 where l.id = _listing_id and l.status = 'pubblicato' and private.is_user_active(l.owner_id));
$$;
create or replace function private.owns_listing(_listing_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.vehicle_listings l where l.id = _listing_id and l.owner_id = (select auth.uid()));
$$;
create or replace function private.vehicle_is_public(_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.vehicle_listings l
                 where l.vehicle_id = _vehicle_id and l.status in ('pubblicato', 'venduto') and private.is_user_active(l.owner_id));
$$;
grant execute on function private.listing_is_public(uuid), private.owns_listing(uuid), private.vehicle_is_public(uuid)
  to anon, authenticated, service_role;

-- Valori del venditore impostati dal sistema alla creazione.
create or replace function private.vehicle_listings_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  _pro public.professional_profiles%rowtype;
  _active_private integer;
begin
  if new.slug is null or new.slug = '' then
    new.slug := private.unique_slug(new.title);
  end if;
  if new.source = 'field_manager' then
    if not private.has_permission('field.manage') then
      raise exception 'Solo il Field Manager può creare annunci raccolti sul territorio' using errcode = '42501';
    end if;
    new.seller_kind := 'professionista';
  else
    select * into _pro from public.professional_profiles
     where user_id = new.owner_id and professional_type in ('venditore_auto', 'officina') limit 1;
    if found then
      new.seller_kind := 'professionista';
      new.professional_profile_id := _pro.id;
    else
      new.seller_kind := 'privato';
      new.professional_profile_id := null;
      -- Regola piattaforma: un privato può avere al massimo 3 annunci aperti.
      select count(*) into _active_private from public.vehicle_listings
       where owner_id = new.owner_id and status in ('bozza', 'in_revisione', 'approvato', 'pubblicato', 'sospeso');
      if _active_private >= 3 then
        raise exception 'Un venditore privato può avere al massimo 3 annunci attivi' using errcode = '22023';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger vehicle_listings_before_insert before insert on public.vehicle_listings
  for each row execute function private.vehicle_listings_before_insert();

-- Requisiti minimi per la pubblicazione.
create or replace function private.listing_publication_problems(_l public.vehicle_listings)
returns text[] language plpgsql stable security definer set search_path = ''
as $$
declare
  _v public.vehicles%rowtype;
  _problems text[] := '{}';
begin
  select * into _v from public.vehicles where id = _l.vehicle_id;
  if _v.year is null then _problems := array_append(_problems, 'anno'::text); end if;
  if _v.mileage_km is null then _problems := array_append(_problems, 'chilometraggio'::text); end if;
  if _v.fuel is null then _problems := array_append(_problems, 'alimentazione'::text); end if;
  if _v.transmission is null then _problems := array_append(_problems, 'cambio'::text); end if;
  if _l.price_cents is null then _problems := array_append(_problems, 'prezzo'::text); end if;
  if _l.city is null then _problems := array_append(_problems, 'città'::text); end if;
  if coalesce(_l.description, '') = '' then _problems := array_append(_problems, 'descrizione'::text); end if;
  if not exists (select 1 from public.vehicle_images i where i.listing_id = _l.id) then
    _problems := array_append(_problems, 'fotografie'::text);
  end if;
  if _l.declared_accuracy_at is null or _l.declared_availability_at is null or _l.declared_right_to_publish_at is null
     or _l.declared_photo_rights_at is null or _l.accepted_terms_at is null then
    _problems := array_append(_problems, 'dichiarazioni del venditore'::text);
  end if;
  if _l.source = 'field_manager' and not exists (
       select 1 from public.seller_authorizations a
        where a.listing_id = _l.id and a.listing_authorized and a.photos_authorized and a.revoked_at is null) then
    _problems := array_append(_problems, 'autorizzazione del venditore'::text);
  end if;
  return _problems;
end;
$$;

-- Transizioni di stato consentite al titolare e campi che richiedono revisione.
create or replace function private.vehicle_listings_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  _is_moderator boolean := private.has_permission('listings.moderate');
  _problems text[];
  _content_changed boolean;
begin
  if new.owner_id <> old.owner_id or new.vehicle_id <> old.vehicle_id or new.source <> old.source
     or new.seller_kind <> old.seller_kind then
    raise exception 'Campi non modificabili' using errcode = '42501';
  end if;

  _content_changed := (new.title, new.description, new.condition_notes, new.maintenance_notes, new.interventions_notes,
                       new.known_defects, new.extra_info, new.city, new.postal_code, new.province)
                      is distinct from
                      (old.title, old.description, old.condition_notes, old.maintenance_notes, old.interventions_notes,
                       old.known_defects, old.extra_info, old.city, old.postal_code, old.province);

  if not _is_moderator and new.status is distinct from old.status then
    if not (
         (old.status in ('bozza', 'rifiutato') and new.status = 'in_revisione')
      or (old.status = 'approvato' and new.status = 'pubblicato')
      or (old.status = 'pubblicato' and new.status = 'sospeso')
      or (old.status = 'sospeso' and new.status = 'pubblicato' and old.owner_suspended and not old.admin_suspended)
      or (old.status in ('pubblicato', 'sospeso') and new.status = 'venduto')
      or (old.status = 'scaduto' and new.status = 'in_revisione')
    ) then
      raise exception 'Cambio di stato non consentito: % → %', old.status, new.status using errcode = '42501';
    end if;
    new.owner_suspended := (new.status = 'sospeso');
  end if;

  -- Modifiche sostanziali a un annuncio pubblicato/approvato tornano in revisione.
  if not _is_moderator and _content_changed and old.status in ('pubblicato', 'approvato') and new.status = old.status then
    new.status := 'in_revisione';
  end if;

  if new.status = 'in_revisione' and old.status is distinct from 'in_revisione' then
    _problems := private.listing_publication_problems(new);
    if cardinality(_problems) > 0 then
      raise exception 'Annuncio incompleto: %', array_to_string(_problems, ', ') using errcode = '22023';
    end if;
  end if;

  if new.status = 'pubblicato' and old.status is distinct from 'pubblicato' then
    if new.approved_at is null then
      raise exception 'Annuncio non ancora approvato' using errcode = '42501';
    end if;
    _problems := private.listing_publication_problems(new);
    if cardinality(_problems) > 0 then
      raise exception 'Requisiti di pubblicazione mancanti: %', array_to_string(_problems, ', ') using errcode = '22023';
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := now() + interval '90 days';
  end if;
  if new.status = 'venduto' and old.status is distinct from 'venduto' then
    new.sold_at := now();
  end if;
  return new;
end;
$$;
create trigger vehicle_listings_before_update before update on public.vehicle_listings
  for each row execute function private.vehicle_listings_before_update();

-- Le modifiche ai dati tecnici di un annuncio pubblicato lo rimandano in revisione.
create or replace function private.vehicles_after_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('listings.moderate') and
     (new.make_slug, new.model, new.version, new.year, new.mileage_km, new.fuel, new.transmission, new.power_kw,
      new.tare_kg, new.power_to_tare_documented, new.first_registration_date, new.condition)
     is distinct from
     (old.make_slug, old.model, old.version, old.year, old.mileage_km, old.fuel, old.transmission, old.power_kw,
      old.tare_kg, old.power_to_tare_documented, old.first_registration_date, old.condition) then
    update public.vehicle_listings set status = 'in_revisione'
     where vehicle_id = new.id and status in ('pubblicato', 'approvato');
  end if;
  return new;
end;
$$;
create trigger vehicles_after_update after update on public.vehicles
  for each row execute function private.vehicles_after_update();

create or replace function private.vehicle_listings_log_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.vehicle_listing_status_history (listing_id, from_status, to_status, actor_id, note)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, (select auth.uid()), new.status_note);
  end if;
  return new;
end;
$$;
create trigger vehicle_listings_log_status after insert or update of status on public.vehicle_listings
  for each row execute function private.vehicle_listings_log_status();

-- ---------------------------------------------------------------------
-- Moderazione amministrativa
-- ---------------------------------------------------------------------
create or replace function public.admin_moderate_listing(listing_id uuid, action text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _l public.vehicle_listings%rowtype;
begin
  if not private.has_permission('listings.moderate') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  select * into _l from public.vehicle_listings where id = listing_id for update;
  if not found then raise exception 'Annuncio non trovato' using errcode = 'P0002'; end if;
  if action in ('rifiuta', 'sospendi', 'richiedi_modifiche') and coalesce(trim(note), '') = '' then
    raise exception 'Indica la motivazione' using errcode = '22023';
  end if;

  if action = 'approva' then
    if _l.status <> 'in_revisione' then raise exception 'L''annuncio non è in revisione' using errcode = '22023'; end if;
    update public.vehicle_listings set status = 'approvato', approved_by = (select auth.uid()), approved_at = now(), status_note = note
     where id = listing_id;
  elsif action = 'approva_pubblica' then
    if _l.status not in ('in_revisione', 'approvato') then raise exception 'Stato non valido' using errcode = '22023'; end if;
    update public.vehicle_listings set approved_by = (select auth.uid()), approved_at = now() where id = listing_id;
    update public.vehicle_listings set status = 'pubblicato', status_note = note where id = listing_id;
  elsif action = 'rifiuta' then
    update public.vehicle_listings set status = 'rifiutato', status_note = note where id = listing_id;
  elsif action = 'richiedi_modifiche' then
    update public.vehicle_listings set status = 'rifiutato', status_note = 'Modifiche richieste: ' || note where id = listing_id;
  elsif action = 'sospendi' then
    update public.vehicle_listings set status = 'sospeso', admin_suspended = true, status_note = note where id = listing_id;
  elsif action = 'riattiva' then
    if _l.status <> 'sospeso' then raise exception 'L''annuncio non è sospeso' using errcode = '22023'; end if;
    update public.vehicle_listings set status = 'pubblicato', admin_suspended = false, owner_suspended = false, status_note = note
     where id = listing_id;
  else
    raise exception 'Azione non valida' using errcode = '22023';
  end if;

  perform private.log_admin_action('listing.' || action, 'vehicle_listings', listing_id::text,
    jsonb_build_object('from', _l.status, 'note', note));
end;
$$;
revoke all on function public.admin_moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_listing(uuid, text, text) to authenticated;

create or replace function public.track_listing_view(listing_slug text)
returns void language sql security definer set search_path = ''
as $$
  update public.vehicle_listings set view_count = view_count + 1 where slug = listing_slug and status = 'pubblicato';
$$;
grant execute on function public.track_listing_view(text) to anon, authenticated;

-- Annunci scaduti (eseguita ogni giorno dal job pianificato, vedi migrazione 0014).
create or replace function private.expire_listings()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _n integer;
begin
  update public.vehicle_listings set status = 'scaduto', status_note = 'Scaduto automaticamente dopo 90 giorni'
   where status = 'pubblicato' and expires_at < now();
  get diagnostics _n = row_count;
  return _n;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.vehicle_listings enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.vehicle_listing_status_history enable row level security;

revoke all on table public.vehicles, public.vehicle_listings, public.vehicle_images, public.vehicle_listing_status_history
  from anon, authenticated;
grant all on table public.vehicles, public.vehicle_listings, public.vehicle_images, public.vehicle_listing_status_history
  to service_role;

-- vehicles
grant select on table public.vehicles to anon, authenticated;
grant insert, delete on table public.vehicles to authenticated;
grant update (make_slug, make_name, model, version, variant_code, vehicle_category, body_type, fuel, transmission, condition,
              first_registration_date, year, mileage_km, engine_cc, power_kw, tare_kg, power_to_tare_documented, doors, seats,
              color, consumption_l100, consumption_kwh100, co2_g_km, emission_class, owners_count, equipment)
  on table public.vehicles to authenticated;
create policy "vehicles: lettura pubblica" on public.vehicles for select to anon, authenticated using (private.vehicle_is_public(id));
create policy "vehicles: lettura titolare" on public.vehicles for select to authenticated using (owner_id = (select auth.uid()));
create policy "vehicles: lettura staff" on public.vehicles for select to authenticated using ((select private.has_permission('listings.moderate')));
create policy "vehicles: creazione titolare" on public.vehicles for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_active_user()));
create policy "vehicles: modifica titolare" on public.vehicles for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_user())) with check (owner_id = (select auth.uid()));
create policy "vehicles: modifica staff" on public.vehicles for update to authenticated
  using ((select private.has_permission('listings.moderate'))) with check (true);
create policy "vehicles: eliminazione titolare" on public.vehicles for delete to authenticated
  using (owner_id = (select auth.uid()) and not exists (
    select 1 from public.vehicle_listings l where l.vehicle_id = vehicles.id and l.status in ('pubblicato', 'venduto')));

-- vehicle_listings
grant select on table public.vehicle_listings to anon, authenticated;
grant insert, delete on table public.vehicle_listings to authenticated;
grant update (title, price_cents, negotiable, description, condition_notes, maintenance_notes, interventions_notes,
              known_defects, extra_info, city, postal_code, province, region, latitude, longitude, status,
              declared_accuracy_at, declared_availability_at, declared_right_to_publish_at, declared_photo_rights_at,
              accepted_terms_at)
  on table public.vehicle_listings to authenticated;
create policy "vehicle_listings: lettura pubblica" on public.vehicle_listings for select to anon, authenticated
  using (status in ('pubblicato', 'venduto') and private.is_user_active(owner_id));
create policy "vehicle_listings: lettura titolare" on public.vehicle_listings for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "vehicle_listings: lettura staff" on public.vehicle_listings for select to authenticated
  using ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')));
create policy "vehicle_listings: creazione" on public.vehicle_listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'bozza' and (select private.is_active_user())
              and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())));
create policy "vehicle_listings: modifica titolare" on public.vehicle_listings for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_user())) with check (owner_id = (select auth.uid()));
create policy "vehicle_listings: eliminazione bozze" on public.vehicle_listings for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('bozza', 'rifiutato'));

-- vehicle_images
grant select on table public.vehicle_images to anon, authenticated;
grant insert, update, delete on table public.vehicle_images to authenticated;
create policy "vehicle_images: lettura pubblica" on public.vehicle_images for select to anon, authenticated
  using (exists (select 1 from public.vehicle_listings l where l.id = listing_id and l.status in ('pubblicato', 'venduto')));
create policy "vehicle_images: titolare" on public.vehicle_images for all to authenticated
  using (private.owns_listing(listing_id))
  with check (private.owns_listing(listing_id) and split_part(storage_path, '/', 1) = (select auth.uid())::text);
create policy "vehicle_images: lettura staff" on public.vehicle_images for select to authenticated
  using ((select private.has_permission('listings.moderate')));

-- storico stati
grant select on table public.vehicle_listing_status_history to authenticated;
create policy "status_history: titolare e staff" on public.vehicle_listing_status_history for select to authenticated
  using (private.owns_listing(listing_id) or (select private.has_permission('listings.moderate')));

-- ---------------------------------------------------------------------
-- Vista di ricerca (rispetta le RLS delle tabelle sottostanti)
-- ---------------------------------------------------------------------
create view public.listing_search with (security_invoker = true) as
select
  l.id, l.slug, l.title, l.price_cents, l.negotiable, l.city, l.postal_code, l.province, l.region,
  l.latitude, l.longitude, l.seller_kind, l.status, l.published_at, l.sold_at, l.created_at,
  l.professional_profile_id, l.view_count,
  v.make_slug, v.make_name, v.model, v.version, v.year, v.mileage_km, v.fuel, v.transmission, v.body_type,
  v.condition, v.power_kw, v.engine_cc, v.first_registration_date,
  coalesce(pp.display_name, 'Venditore privato') as seller_name,
  (select i.storage_path from public.vehicle_images i where i.listing_id = l.id order by i.is_cover desc, i.position limit 1) as cover_path,
  lower(v.make_name || ' ' || v.model || ' ' || coalesce(v.version, '') || ' ' || l.title) as search_text
from public.vehicle_listings l
join public.vehicles v on v.id = l.vehicle_id
left join public.professional_profiles pp on pp.id = l.professional_profile_id;

grant select on public.listing_search to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: immagini annunci e media dei professionisti (bucket pubblici,
-- percorsi casuali "<user_id>/<uuid>.<ext>"; scrittura solo nella propria cartella)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('business-media', 'business-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "listing-images: scrittura nella propria cartella" on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-images', 'business-media')
              and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.is_active_user()));
create policy "listing-images: lettura propri file" on storage.objects for select to authenticated
  using (bucket_id in ('listing-images', 'business-media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing-images: sostituzione propri file" on storage.objects for update to authenticated
  using (bucket_id in ('listing-images', 'business-media') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('listing-images', 'business-media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing-images: eliminazione propri file" on storage.objects for delete to authenticated
  using (bucket_id in ('listing-images', 'business-media') and (storage.foldername(name))[1] = (select auth.uid())::text);

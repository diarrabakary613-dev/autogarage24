-- =====================================================================
-- AutoGarage24 — Migrazione 0003: profili professionali e verifiche
-- Tabelle: professional_profiles (pubblico), business_profiles (privato),
--          verification_requests, verification_documents
-- =====================================================================

-- Trasforma un testo in uno slug URL (es. "Officina Rossi & C." -> "officina-rossi-c").
create or replace function private.slugify(_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(_value, ''),
      'àáâãäåèéêëìíîïòóôõöùúûüçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇÑ',
      'aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
$$;
grant execute on function private.slugify(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- professional_profiles: vetrina pubblica del professionista.
-- I campi badge (*_verified_at) sono impostabili solo dagli amministratori.
-- ---------------------------------------------------------------------
create table public.professional_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references public.profiles (id) on delete cascade,
  professional_type       public.app_role not null
                            check (private.is_professional_role(professional_type)),
  display_name            text not null check (char_length(display_name) between 2 and 120),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description             text check (char_length(description) <= 4000),
  phone_public            text check (char_length(phone_public) <= 30),
  email_public            text check (char_length(email_public) <= 254),
  website                 text check (website ~* '^https?://'),
  address_line            text check (char_length(address_line) <= 200),
  show_address            boolean not null default false,
  city                    text check (char_length(city) <= 80),
  province                text check (char_length(province) <= 40),
  postal_code             text check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  country_code            text not null default 'IT' check (country_code ~ '^[A-Z]{2}$'),
  latitude                double precision check (latitude between -90 and 90),
  longitude               double precision check (longitude between -180 and 180),
  is_published            boolean not null default false,
  -- Badge: valorizzati solo quando il controllo è stato effettivamente eseguito.
  identity_verified_at    timestamptz,
  business_verified_at    timestamptz,
  documents_checked_at    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,
  constraint professional_profiles_publish_requirements
    check (not is_published or (city is not null and char_length(display_name) >= 2))
);

comment on table public.professional_profiles is
  'Profilo pubblico di officine, meccanici e venditori. Visibile a tutti solo se pubblicato.';
comment on column public.professional_profiles.identity_verified_at is
  'Badge "Identità verificata": impostato solo da un amministratore dopo un controllo reale.';

create index professional_profiles_type_city_idx
  on public.professional_profiles (professional_type, lower(city))
  where is_published and deleted_at is null;

create trigger professional_profiles_set_updated_at
  before update on public.professional_profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- business_profiles: dati fiscali/legali dell'attività. Mai pubblici.
-- ---------------------------------------------------------------------
create table public.business_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.profiles (id) on delete cascade,
  legal_name         text not null check (char_length(legal_name) between 2 and 200),
  country_code       text not null default 'IT' check (country_code ~ '^[A-Z]{2}$'),
  vat_number         text,
  tax_code           text check (char_length(tax_code) <= 20),
  legal_address      text check (char_length(legal_address) <= 200),
  legal_city         text check (char_length(legal_city) <= 80),
  legal_postal_code  text check (legal_postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  legal_province     text check (char_length(legal_province) <= 40),
  pec_email          text check (char_length(pec_email) <= 254),
  sdi_code           text check (sdi_code ~ '^[A-Z0-9]{7}$'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Partita IVA italiana: 11 cifre.
  constraint business_profiles_vat_it
    check (vat_number is null or country_code <> 'IT' or vat_number ~ '^[0-9]{11}$')
);

comment on table public.business_profiles is
  'Dati legali e fiscali dell''attività professionale. Visibili solo al titolare e agli amministratori.';

create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- verification_requests / verification_documents
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  verification_type  public.verification_type not null,
  status             public.verification_status not null default 'in_attesa',
  user_notes         text check (char_length(user_notes) <= 2000),
  decision_note      text check (char_length(decision_note) <= 2000),
  reviewed_by        uuid references public.profiles (id) on delete set null,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.verification_requests is
  'Richieste di verifica inviate dai professionisti. Esito deciso solo dagli amministratori.';

-- Una sola richiesta aperta per tipo e utente.
create unique index verification_requests_one_open_idx
  on public.verification_requests (user_id, verification_type)
  where status in ('in_attesa', 'in_revisione');
create index verification_requests_status_idx
  on public.verification_requests (status, created_at);

create trigger verification_requests_set_updated_at
  before update on public.verification_requests
  for each row execute function private.set_updated_at();

create table public.verification_documents (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.verification_requests (id) on delete cascade,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  storage_path   text not null unique check (char_length(storage_path) <= 400),
  original_name  text not null check (char_length(original_name) <= 255),
  mime_type      text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at     timestamptz not null default now(),
  constraint verification_documents_path_owner
    check (split_part(storage_path, '/', 1) = owner_id::text)
);

create index verification_documents_request_idx on public.verification_documents (request_id);

-- Verifica se un account (qualsiasi) è attivo: usata per nascondere i
-- profili pubblici degli account sospesi. Restituisce solo un booleano.
create or replace function private.is_user_active(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _user_id and p.account_status = 'attivo' and p.deleted_at is null
  );
$$;
revoke all on function private.is_user_active(uuid) from public;
grant execute on function private.is_user_active(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Privilegi e RLS
-- ---------------------------------------------------------------------
alter table public.professional_profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.verification_requests enable row level security;
alter table public.verification_documents enable row level security;

revoke all on table public.professional_profiles from anon, authenticated;
revoke all on table public.business_profiles from anon, authenticated;
revoke all on table public.verification_requests from anon, authenticated;
revoke all on table public.verification_documents from anon, authenticated;

grant all on table public.professional_profiles to service_role;
grant all on table public.business_profiles to service_role;
grant all on table public.verification_requests to service_role;
grant all on table public.verification_documents to service_role;

-- professional_profiles ------------------------------------------------
grant select on table public.professional_profiles to anon, authenticated;
grant update (display_name, description, phone_public, email_public, website, address_line,
              show_address, city, province, postal_code, latitude, longitude, is_published)
  on table public.professional_profiles to authenticated;

create policy "professional_profiles: lettura pubblica dei profili pubblicati"
  on public.professional_profiles for select
  to anon, authenticated
  using (
    is_published
    and deleted_at is null
    and private.is_user_active(user_id)
  );

create policy "professional_profiles: lettura del titolare"
  on public.professional_profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "professional_profiles: lettura amministratori"
  on public.professional_profiles for select
  to authenticated
  using ((select private.is_admin()));

create policy "professional_profiles: modifica del titolare"
  on public.professional_profiles for update
  to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null and (select private.is_active_user()))
  with check (user_id = (select auth.uid()));

-- business_profiles ----------------------------------------------------
grant select, insert, update on table public.business_profiles to authenticated;

create policy "business_profiles: lettura del titolare"
  on public.business_profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "business_profiles: lettura amministratori"
  on public.business_profiles for select
  to authenticated
  using ((select private.is_admin()));

create policy "business_profiles: creazione del titolare professionista"
  on public.business_profiles for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.is_active_user())
    and exists (select 1 from public.professional_profiles pp where pp.user_id = (select auth.uid()))
  );

create policy "business_profiles: modifica del titolare"
  on public.business_profiles for update
  to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_user()))
  with check (user_id = (select auth.uid()));

-- verification_requests ------------------------------------------------
grant select on table public.verification_requests to authenticated;
grant insert (verification_type, user_notes, user_id) on table public.verification_requests to authenticated;

create policy "verification_requests: lettura del titolare"
  on public.verification_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "verification_requests: lettura amministratori"
  on public.verification_requests for select
  to authenticated
  using ((select private.is_admin()));

create policy "verification_requests: invio da professionista attivo"
  on public.verification_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'in_attesa'
    and (select private.is_active_user())
    and exists (select 1 from public.professional_profiles pp where pp.user_id = (select auth.uid()))
  );

-- verification_documents -----------------------------------------------
grant select, delete on table public.verification_documents to authenticated;
grant insert (request_id, owner_id, storage_path, original_name, mime_type, size_bytes)
  on table public.verification_documents to authenticated;

create policy "verification_documents: lettura del titolare"
  on public.verification_documents for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "verification_documents: lettura amministratori"
  on public.verification_documents for select
  to authenticated
  using ((select private.is_admin()));

create policy "verification_documents: caricamento su richiesta aperta"
  on public.verification_documents for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.verification_requests vr
      where vr.id = request_id
        and vr.user_id = (select auth.uid())
        and vr.status = 'in_attesa'
    )
  );

create policy "verification_documents: rimozione su richiesta aperta"
  on public.verification_documents for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.verification_requests vr
      where vr.id = request_id and vr.status = 'in_attesa'
    )
  );

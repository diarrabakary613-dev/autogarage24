-- =====================================================================
-- AutoGarage24 — Migrazione 0008 (Fasi 5–6): profili professionali
-- completi, revisione amministrativa, servizi, foto, collegamenti
-- meccanico ↔ officina, certificazioni documentate.
-- =====================================================================

create type public.profile_review_status as enum ('bozza', 'inviato', 'in_verifica', 'approvato', 'rifiutato', 'sospeso');
create type public.price_type as enum ('fisso', 'a_partire_da', 'su_preventivo');
create type public.work_mode as enum ('sede', 'officina_partner', 'mobile');

-- Categorie di attività (officine) e specializzazioni (meccanici) sono
-- testi controllati da elenchi in tabella, gestibili dall'amministrazione.
create table public.business_categories (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 80),
  applies_to  text not null check (applies_to in ('officina', 'meccanico', 'entrambi')),
  position    integer not null default 0,
  active      boolean not null default true
);

insert into public.business_categories (slug, name, applies_to, position) values
  ('officina-meccanica','Officina meccanica','officina',1), ('elettrauto','Elettrauto','entrambi',2),
  ('carrozzeria','Carrozzeria','officina',3), ('gommista','Gommista','officina',4),
  ('centro-revisioni','Centro revisioni','officina',5), ('centro-tagliandi','Centro tagliandi','officina',6),
  ('centro-diagnosi','Centro diagnosi','officina',7), ('climatizzazione','Specialista climatizzazione','entrambi',8),
  ('centro-freni','Centro freni','officina',9), ('cambio-automatico','Centro cambio automatico','officina',10),
  ('centro-pneumatici','Centro pneumatici','officina',11), ('detailing','Centro detailing','officina',12),
  ('lavaggio','Lavaggio auto','officina',13), ('accessori','Centro installazione accessori','officina',14),
  ('cristalli','Centro riparazione cristalli','officina',15),
  ('meccanica-generale','Meccanica generale','meccanico',20), ('diagnosi-elettronica','Diagnosi elettronica','meccanico',21),
  ('freni','Freni','meccanico',22), ('frizione','Frizione','meccanico',23), ('motore','Motore','meccanico',24),
  ('cambio','Cambio','meccanico',25), ('sospensioni','Sospensioni','meccanico',26), ('pneumatici','Pneumatici','meccanico',27),
  ('manutenzione-ordinaria','Manutenzione ordinaria','meccanico',28), ('tagliandi','Tagliandi','meccanico',29),
  ('ricerca-guasti','Ricerca guasti','meccanico',30), ('ibride-elettriche','Veicoli ibridi ed elettrici','meccanico',31);

alter table public.business_categories enable row level security;
revoke all on table public.business_categories from anon, authenticated;
grant select on table public.business_categories to anon, authenticated;
grant all on table public.business_categories to service_role;
create policy "business_categories: lettura pubblica" on public.business_categories for select to anon, authenticated using (true);
create policy "business_categories: gestione" on public.business_categories for all to authenticated
  using ((select private.has_permission('categories.manage'))) with check ((select private.has_permission('categories.manage')));
grant insert, update, delete on table public.business_categories to authenticated;

-- ---------------------------------------------------------------------
-- Estensione di professional_profiles
-- ---------------------------------------------------------------------
alter table public.professional_profiles
  add column review_status      public.profile_review_status not null default 'bozza',
  add column review_note        text check (char_length(review_note) <= 1000),
  add column reviewed_by        uuid references public.profiles (id) on delete set null,
  add column reviewed_at        timestamptz,
  add column submitted_at       timestamptz,
  add column categories         text[] not null default '{}',
  add column brands_served      text[] not null default '{}',
  add column opening_hours      jsonb not null default '{}'::jsonb,
  add column closed_days        text check (char_length(closed_days) <= 300),
  add column region             text check (char_length(region) <= 40),
  add column contact_person     text check (char_length(contact_person) <= 120),
  add column logo_path          text check (char_length(logo_path) <= 300),
  add column cover_path         text check (char_length(cover_path) <= 300),
  add column work_modes         public.work_mode[] not null default '{}',
  add column experience_years   integer check (experience_years between 0 and 70),
  add column service_area       text check (char_length(service_area) <= 300),
  add column service_radius_km  integer check (service_radius_km between 1 and 300),
  add column accepts_appointments boolean not null default false,
  add column view_count         integer not null default 0;

comment on column public.professional_profiles.review_status is
  'Revisione amministrativa del profilo. Il profilo è pubblico solo se approvato e pubblicato.';
comment on column public.professional_profiles.experience_years is
  'Esperienza DICHIARATA dal professionista, non verificata.';

create index professional_profiles_review_idx on public.professional_profiles (review_status);
create index professional_profiles_categories_idx on public.professional_profiles using gin (categories);
create index professional_profiles_geo_idx on public.professional_profiles (latitude, longitude) where latitude is not null;

-- Il titolare può modificare i nuovi campi descrittivi (non lo stato di revisione).
grant update (categories, brands_served, opening_hours, closed_days, region, contact_person, logo_path,
              cover_path, work_modes, experience_years, service_area, service_radius_km, accepts_appointments)
  on table public.professional_profiles to authenticated;

-- La lettura pubblica ora richiede anche l'approvazione amministrativa.
drop policy "professional_profiles: lettura pubblica dei profili pubblicati" on public.professional_profiles;
create policy "professional_profiles: lettura pubblica dei profili approvati"
  on public.professional_profiles for select to anon, authenticated
  using (is_published and review_status = 'approvato' and deleted_at is null and private.is_user_active(user_id));

create policy "professional_profiles: lettura staff"
  on public.professional_profiles for select to authenticated
  using ((select private.has_permission('professionals.verify')) or (select private.has_permission('listings.moderate')));

-- Invio del profilo per la verifica (bozza/rifiutato → inviato).
create or replace function public.submit_professional_profile()
returns void language plpgsql security definer set search_path = ''
as $$
declare _p public.professional_profiles%rowtype;
begin
  select * into _p from public.professional_profiles where user_id = (select auth.uid()) for update;
  if not found then raise exception 'Profilo professionale non trovato' using errcode = 'P0002'; end if;
  if not private.is_active_user() then raise exception 'Account non attivo' using errcode = '42501'; end if;
  if _p.review_status not in ('bozza', 'rifiutato') then
    raise exception 'Il profilo è già stato inviato' using errcode = '22023';
  end if;
  if _p.city is null or coalesce(_p.description, '') = '' or cardinality(_p.categories) = 0 then
    raise exception 'Completa città, descrizione e almeno una categoria prima dell''invio' using errcode = '22023';
  end if;
  update public.professional_profiles
     set review_status = 'inviato', submitted_at = now(), review_note = null
   where id = _p.id;
end;
$$;
revoke all on function public.submit_professional_profile() from public, anon;
grant execute on function public.submit_professional_profile() to authenticated;

-- Esito della revisione (staff con permesso professionals.verify).
create or replace function public.admin_review_professional_profile(
  profile_id uuid, decision public.profile_review_status, note text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare _old public.profile_review_status;
begin
  if not private.has_permission('professionals.verify') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  if decision not in ('in_verifica', 'approvato', 'rifiutato', 'sospeso') then
    raise exception 'Esito non valido' using errcode = '22023';
  end if;
  if decision in ('rifiutato', 'sospeso') and coalesce(trim(note), '') = '' then
    raise exception 'Indica la motivazione' using errcode = '22023';
  end if;
  select review_status into _old from public.professional_profiles where id = profile_id for update;
  if not found then raise exception 'Profilo non trovato' using errcode = 'P0002'; end if;
  update public.professional_profiles
     set review_status = decision, review_note = note, reviewed_by = (select auth.uid()), reviewed_at = now(),
         is_published = case when decision = 'approvato' then true when decision = 'sospeso' then false else is_published end
   where id = profile_id;
  perform private.log_admin_action('professional.reviewed', 'professional_profiles', profile_id::text,
    jsonb_build_object('from', _old, 'to', decision, 'note', note));
end;
$$;
revoke all on function public.admin_review_professional_profile(uuid, public.profile_review_status, text) from public, anon;
grant execute on function public.admin_review_professional_profile(uuid, public.profile_review_status, text) to authenticated;

-- Contatore visualizzazioni (incrementabile da chiunque, solo +1).
create or replace function public.track_profile_view(profile_slug text)
returns void language sql security definer set search_path = ''
as $$
  update public.professional_profiles set view_count = view_count + 1
   where slug = profile_slug and is_published and review_status = 'approvato';
$$;
grant execute on function public.track_profile_view(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Servizi offerti
-- ---------------------------------------------------------------------
create table public.professional_services (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.professional_profiles (id) on delete cascade,
  name              text not null check (char_length(name) between 2 and 120),
  category          text references public.business_categories (slug) on delete set null,
  description       text check (char_length(description) <= 2000),
  price_type        public.price_type not null default 'su_preventivo',
  price_cents       integer check (price_cents >= 0 and price_cents <= 100000000),
  duration_text     text check (char_length(duration_text) <= 80),
  vehicle_types     text check (char_length(vehicle_types) <= 200),
  work_mode         public.work_mode,
  active            boolean not null default true,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint professional_services_price check (
    (price_type = 'su_preventivo' and price_cents is null) or (price_type <> 'su_preventivo' and price_cents is not null))
);
create index professional_services_profile_idx on public.professional_services (profile_id) where active;
create index professional_services_category_idx on public.professional_services (category) where active;
create trigger professional_services_set_updated_at before update on public.professional_services
  for each row execute function private.set_updated_at();

-- Utilità: il profilo appartiene all'utente corrente?
create or replace function private.owns_profile(_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.professional_profiles where id = _profile_id and user_id = (select auth.uid()));
$$;
create or replace function private.profile_is_public(_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.professional_profiles pp
                 where pp.id = _profile_id and pp.is_published and pp.review_status = 'approvato'
                   and pp.deleted_at is null and private.is_user_active(pp.user_id));
$$;
grant execute on function private.owns_profile(uuid) to anon, authenticated, service_role;
grant execute on function private.profile_is_public(uuid) to anon, authenticated, service_role;

alter table public.professional_services enable row level security;
revoke all on table public.professional_services from anon, authenticated;
grant select on table public.professional_services to anon, authenticated;
grant insert, update, delete on table public.professional_services to authenticated;
grant all on table public.professional_services to service_role;
create policy "professional_services: lettura pubblica" on public.professional_services for select to anon, authenticated
  using (active and private.profile_is_public(profile_id));
create policy "professional_services: lettura titolare e staff" on public.professional_services for select to authenticated
  using (private.owns_profile(profile_id) or (select private.has_permission('listings.moderate')));
create policy "professional_services: gestione titolare" on public.professional_services for all to authenticated
  using (private.owns_profile(profile_id) and (select private.is_active_user()))
  with check (private.owns_profile(profile_id) and (select private.is_active_user()));
create policy "professional_services: moderazione staff" on public.professional_services for update to authenticated
  using ((select private.has_permission('listings.moderate'))) with check ((select private.has_permission('listings.moderate')));

-- ---------------------------------------------------------------------
-- Foto dell'attività / dei lavori (autorizzate dal professionista)
-- ---------------------------------------------------------------------
create table public.business_photos (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.professional_profiles (id) on delete cascade,
  storage_path  text not null unique check (char_length(storage_path) <= 400),
  kind          text not null default 'galleria' check (kind in ('galleria', 'lavori')),
  caption       text check (char_length(caption) <= 200),
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index business_photos_profile_idx on public.business_photos (profile_id, position);
alter table public.business_photos enable row level security;
revoke all on table public.business_photos from anon, authenticated;
grant select on table public.business_photos to anon, authenticated;
grant insert, update, delete on table public.business_photos to authenticated;
grant all on table public.business_photos to service_role;
create policy "business_photos: lettura pubblica" on public.business_photos for select to anon, authenticated
  using (private.profile_is_public(profile_id));
create policy "business_photos: titolare" on public.business_photos for all to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

-- ---------------------------------------------------------------------
-- Collegamento meccanico ↔ officina, con accettazione esplicita
-- ---------------------------------------------------------------------
create table public.professional_affiliations (
  id                  uuid primary key default gen_random_uuid(),
  mechanic_profile_id uuid not null references public.professional_profiles (id) on delete cascade,
  garage_profile_id   uuid not null references public.professional_profiles (id) on delete cascade,
  status              text not null default 'in_attesa' check (status in ('in_attesa', 'accettato', 'rifiutato', 'revocato')),
  message             text check (char_length(message) <= 500),
  created_at          timestamptz not null default now(),
  decided_at          timestamptz,
  unique (mechanic_profile_id, garage_profile_id),
  check (mechanic_profile_id <> garage_profile_id)
);
alter table public.professional_affiliations enable row level security;
revoke all on table public.professional_affiliations from anon, authenticated;
grant select on table public.professional_affiliations to anon, authenticated;
grant insert on table public.professional_affiliations to authenticated;
grant all on table public.professional_affiliations to service_role;
create policy "affiliations: pubbliche se accettate" on public.professional_affiliations for select to anon, authenticated
  using (status = 'accettato' and private.profile_is_public(mechanic_profile_id) and private.profile_is_public(garage_profile_id));
create policy "affiliations: parti coinvolte" on public.professional_affiliations for select to authenticated
  using (private.owns_profile(mechanic_profile_id) or private.owns_profile(garage_profile_id));
create policy "affiliations: richiesta dal meccanico" on public.professional_affiliations for insert to authenticated
  with check (private.owns_profile(mechanic_profile_id) and status = 'in_attesa'
              and exists (select 1 from public.professional_profiles g where g.id = garage_profile_id and g.professional_type = 'officina'));

-- L'officina decide; il meccanico può solo revocare.
create or replace function public.decide_affiliation(affiliation_id uuid, decision text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _a public.professional_affiliations%rowtype;
begin
  select * into _a from public.professional_affiliations where id = affiliation_id for update;
  if not found then raise exception 'Collegamento non trovato' using errcode = 'P0002'; end if;
  if decision in ('accettato', 'rifiutato') and private.owns_profile(_a.garage_profile_id) and _a.status = 'in_attesa' then
    update public.professional_affiliations set status = decision, decided_at = now() where id = affiliation_id;
  elsif decision = 'revocato' and (private.owns_profile(_a.garage_profile_id) or private.owns_profile(_a.mechanic_profile_id)) then
    update public.professional_affiliations set status = 'revocato', decided_at = now() where id = affiliation_id;
  else
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.decide_affiliation(uuid, text) from public, anon;
grant execute on function public.decide_affiliation(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Certificazioni: dichiarate dal professionista, visibili come
-- "verificate" solo dopo il controllo amministrativo del documento.
-- ---------------------------------------------------------------------
create table public.professional_certifications (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.professional_profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 2 and 160),
  issuer         text check (char_length(issuer) <= 160),
  issued_on      date,
  document_path  text check (char_length(document_path) <= 400),
  verified_at    timestamptz,
  verified_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.professional_certifications enable row level security;
revoke all on table public.professional_certifications from anon, authenticated;
grant select on table public.professional_certifications to anon, authenticated;
grant insert, delete on table public.professional_certifications to authenticated;
grant update (title, issuer, issued_on, document_path) on table public.professional_certifications to authenticated;
grant all on table public.professional_certifications to service_role;
create policy "certifications: pubbliche solo se verificate" on public.professional_certifications for select to anon, authenticated
  using (verified_at is not null and private.profile_is_public(profile_id));
create policy "certifications: titolare e staff" on public.professional_certifications for select to authenticated
  using (private.owns_profile(profile_id) or (select private.has_permission('professionals.verify')));
create policy "certifications: gestione titolare" on public.professional_certifications for insert to authenticated
  with check (private.owns_profile(profile_id));
create policy "certifications: modifica titolare" on public.professional_certifications for update to authenticated
  using (private.owns_profile(profile_id) and verified_at is null) with check (private.owns_profile(profile_id));
create policy "certifications: eliminazione titolare" on public.professional_certifications for delete to authenticated
  using (private.owns_profile(profile_id));

create or replace function public.admin_verify_certification(certification_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('professionals.verify') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  update public.professional_certifications
     set verified_at = case when approve then now() else null end,
         verified_by = case when approve then (select auth.uid()) else null end
   where id = certification_id;
  perform private.log_admin_action(case when approve then 'certification.verified' else 'certification.unverified' end,
    'professional_certifications', certification_id::text, '{}'::jsonb);
end;
$$;
revoke all on function public.admin_verify_certification(uuid, boolean) from public, anon;
grant execute on function public.admin_verify_certification(uuid, boolean) to authenticated;


-- =====================================================================
-- AutoGarage24 — Migrazione 0002: profili utente e ruoli
-- Tabelle: profiles, user_roles
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: un record per ogni utente di Supabase Auth.
-- Dati personali: leggibili solo dal titolare e dagli amministratori.
-- ---------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text not null,
  full_name             text check (char_length(full_name) <= 120),
  phone                 text check (char_length(phone) <= 30),
  city                  text check (char_length(city) <= 80),
  postal_code           text check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  avatar_path           text check (char_length(avatar_path) <= 300),
  locale                text not null default 'it' check (locale in ('it', 'en')),
  account_status        public.account_status not null default 'attivo',
  status_reason         text check (char_length(status_reason) <= 500),
  terms_accepted_at     timestamptz,
  marketing_consent     boolean not null default false,
  marketing_consent_at  timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

comment on table public.profiles is
  'Profilo privato di ogni utente. Visibile solo al titolare e agli amministratori.';

create index profiles_account_status_idx on public.profiles (account_status);
create index profiles_email_lower_idx on public.profiles (lower(email));
create index profiles_created_at_idx on public.profiles (created_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Registra la data del consenso marketing quando cambia.
create or replace function private.profiles_track_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.marketing_consent is distinct from old.marketing_consent then
    new.marketing_consent_at := case when new.marketing_consent then now() else null end;
  end if;
  return new;
end;
$$;

create trigger profiles_track_consent
  before insert or update of marketing_consent on public.profiles
  for each row execute function private.profiles_track_consent();

-- ---------------------------------------------------------------------
-- user_roles: ruoli assegnati. Nessun utente può assegnarsi ruoli da solo.
-- ---------------------------------------------------------------------
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  granted_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is
  'Ruoli applicativi. Modificabili solo tramite funzioni amministrative con audit log.';

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------
-- Funzioni di autorizzazione (schema privato, non esposto alle API).
-- SECURITY DEFINER è necessario per evitare ricorsione nelle policy RLS;
-- le funzioni leggono esclusivamente i dati dell'utente corrente.
-- ---------------------------------------------------------------------
create or replace function private.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and ur.role = _role
      and p.account_status = 'attivo'
      and p.deleted_at is null
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin'::public.app_role);
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'attivo'
      and p.deleted_at is null
  );
$$;

create or replace function private.is_professional_role(_role public.app_role)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select _role in ('officina', 'meccanico', 'venditore_auto', 'venditore_ricambi');
$$;

revoke all on function private.has_role(public.app_role) from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_active_user() from public;
grant execute on function private.has_role(public.app_role) to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_active_user() to anon, authenticated, service_role;
grant execute on function private.is_professional_role(public.app_role) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Privilegi e RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

-- Il titolare può modificare SOLO questi campi. Stato account, email,
-- date di consenso e cancellazione restano fuori dalla sua portata.
grant select on table public.profiles to authenticated;
grant update (full_name, phone, city, postal_code, avatar_path, locale, marketing_consent)
  on table public.profiles to authenticated;

grant select on table public.user_roles to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.user_roles to service_role;

create policy "profiles: lettura del proprio profilo"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: lettura amministratori"
  on public.profiles for select
  to authenticated
  using ((select private.is_admin()));

create policy "profiles: modifica del proprio profilo attivo"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and account_status = 'attivo' and deleted_at is null)
  with check (id = (select auth.uid()));

create policy "user_roles: lettura dei propri ruoli"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_roles: lettura amministratori"
  on public.user_roles for select
  to authenticated
  using ((select private.is_admin()));

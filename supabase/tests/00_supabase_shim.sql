-- =====================================================================
-- SOLO PER I TEST LOCALI — NON APPLICARE A SUPABASE.
-- Ricrea in un PostgreSQL "vuoto" gli elementi minimi di Supabase
-- (ruoli, auth.users, auth.uid(), storage) per verificare migrazioni e RLS.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  raw_app_meta_data   jsonb default '{}'::jsonb,
  email_confirmed_at  timestamptz,
  created_at          timestamptz default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  ), '')::uuid;
$$;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                  text primary key,
  name                text not null,
  public              boolean default false,
  file_size_limit     bigint,
  allowed_mime_types  text[]
);

create table storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant all on storage.objects, storage.buckets to service_role;

create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- Utilità di test -----------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Esegue un'istruzione e fallisce se NON genera un errore.
create function tests.expect_error(_sql text, _label text) returns void
language plpgsql as $$
begin
  begin
    execute _sql;
  exception when others then
    raise notice 'OK (errore atteso) — %: %', _label, sqlerrm;
    return;
  end;
  raise exception 'TEST FALLITO — doveva essere bloccato: %', _label;
end;
$$;

create function tests.expect(_condition boolean, _label text) returns void
language plpgsql as $$
begin
  if _condition is distinct from true then
    raise exception 'TEST FALLITO — %', _label;
  end if;
  raise notice 'OK — %', _label;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Cambio di identità nei test (solo test locali).
create function tests.as_user(_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end;
$$;
create function tests.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role service_role';
end;
$$;
create table tests.ids (name text primary key, id uuid not null);
create function tests.id(_name text) returns uuid language sql stable as $$ select id from tests.ids where name = _name $$;
grant select, insert on tests.ids to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;


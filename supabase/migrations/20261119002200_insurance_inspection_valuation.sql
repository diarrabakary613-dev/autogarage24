-- =====================================================================
-- Migrazione 0022 — Fase 24 (assicurazioni: informazione e contatti),
-- Fase 25 (revisioni), Fase 26 (valutazione, offerte e permute)
--
--  * Assicurazioni: AutoGarage24 NON distribuisce prodotti assicurativi. Raccoglie
--    richieste e, solo con consenso esplicito per singolo partner, le inoltra a
--    soggetti verificati (iscrizione RUI / albo imprese IVASS). I preventivi possono
--    arrivare solo dai partner (utenti abilitati) o da integrazioni ufficiali configurate.
--  * Revisioni: centri con autorizzazione verificata dallo staff; scadenze calcolate
--    secondo l'art. 80 del Codice della Strada con regole configurabili e fonte esplicita.
--  * Valutazioni: stima interna dichiarata come preliminare, basata su annunci reali
--    della piattaforma; con dati insufficienti non viene prodotto alcun valore.
-- =====================================================================

-- =====================================================================
-- FASE 24 — ASSICURAZIONI
-- =====================================================================
create table public.insurance_partners (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 120),
  partner_type       text not null check (partner_type in ('compagnia', 'agente', 'broker', 'comparatore', 'banca_intermediario')),
  legal_name         text not null check (char_length(legal_name) between 2 and 200),
  vat_number         text check (vat_number ~ '^[0-9]{11}$'),
  rui_section        text check (rui_section in ('A', 'B', 'C', 'D', 'E', 'F')),
  rui_number         text check (rui_number ~ '^[A-Z]?[0-9]{6,12}$'),
  ivass_company_code text check (char_length(ivass_company_code) <= 20),
  registry_checked_at date,
  registry_evidence  text check (char_length(registry_evidence) <= 1000),
  description        text check (char_length(description) <= 2000),
  coverages          text[] not null default '{}' check (coverages <@ array['rca', 'furto_incendio', 'kasko', 'eventi_atmosferici', 'assistenza_stradale',
                       'tutela_legale', 'cristalli', 'infortuni_conducente', 'altro']::text[]),
  website_url        text check (website_url ~ '^https://'),
  privacy_url        text check (privacy_url ~ '^https://'),
  contact_email      text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone      text check (contact_phone ~ '^[0-9 +().-]{6,30}$'),
  status             text not null default 'bozza' check (status in ('bozza', 'in_verifica', 'verificato', 'sospeso')),
  status_note        text check (char_length(status_note) <= 500),
  verified_by        uuid references public.profiles (id) on delete set null,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Un partner verificato deve avere un'iscrizione verificabile e un'informativa privacy.
  check (status <> 'verificato' or (registry_checked_at is not null and privacy_url is not null
         and (rui_number is not null or ivass_company_code is not null)))
);
create trigger insurance_partners_updated before update on public.insurance_partners for each row execute function private.set_updated_at();

-- Utenti del partner abilitati a ricevere le richieste e inviare preventivi (gestiti dallo staff).
create table public.insurance_partner_users (
  partner_id  uuid not null references public.insurance_partners (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  added_by    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (partner_id, user_id)
);

-- Integrazioni: solo metadati. Le credenziali NON sono mai nel database (solo il nome della variabile d'ambiente).
create table public.insurance_integrations (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.insurance_partners (id) on delete cascade,
  kind            text not null check (kind in ('api', 'webhook', 'link_esterno', 'email')),
  status          text not null default 'non_configurato' check (status in ('non_configurato', 'in_test', 'attivo', 'errore', 'disattivato')),
  endpoint_url    text check (endpoint_url ~ '^https://'),
  secret_env_name text check (secret_env_name ~ '^[A-Z][A-Z0-9_]{2,60}$'),
  contract_ref    text check (char_length(contract_ref) <= 200),
  last_success_at timestamptz,
  last_error      text check (char_length(last_error) <= 1000),
  notes           text check (char_length(notes) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger insurance_integrations_updated before update on public.insurance_integrations for each row execute function private.set_updated_at();

create table public.insurance_quote_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  user_vehicle_id  uuid references public.user_vehicles (id) on delete set null,
  vehicle_make     text not null check (char_length(vehicle_make) between 1 and 60),
  vehicle_model    text not null check (char_length(vehicle_model) between 1 and 80),
  vehicle_year     integer check (vehicle_year between 1950 and 2100),
  fuel             text check (char_length(fuel) <= 30),
  power_kw         integer check (power_kw between 1 and 1500),
  registration_date date,
  plate            text check (plate ~ '^[A-Z0-9]{5,10}$'),
  coverages        text[] not null check (cardinality(coverages) between 1 and 9 and coverages <@ array['rca', 'furto_incendio', 'kasko', 'eventi_atmosferici',
                     'assistenza_stradale', 'tutela_legale', 'cristalli', 'infortuni_conducente', 'altro']::text[]),
  province         text not null check (province ~ '^[A-Z]{2}$'),
  postal_code      text check (postal_code ~ '^[0-9]{5}$'),
  desired_start    date,
  contact_channel  text not null default 'piattaforma' check (contact_channel in ('piattaforma', 'email', 'telefono')),
  contact_phone    text check (contact_phone ~ '^[0-9 +().-]{6,30}$'),
  notes            text check (char_length(notes) <= 1000),
  status           text not null default 'inviata' check (status in ('inviata', 'ritirata', 'chiusa')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index insurance_requests_user_idx on public.insurance_quote_requests (user_id, created_at desc);
create trigger insurance_requests_updated before update on public.insurance_quote_requests for each row execute function private.set_updated_at();

-- Consenso e stato per singolo partner: i dati arrivano solo ai partner scelti.
create table public.insurance_request_partners (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.insurance_quote_requests (id) on delete cascade,
  partner_id       uuid not null references public.insurance_partners (id) on delete cascade,
  consent_at       timestamptz not null default now(),
  consent_version  text not null default '2026-11',
  status           text not null default 'inviata' check (status in ('inviata', 'in_lavorazione', 'preventivo_disponibile', 'non_quotabile', 'ritirata', 'chiusa')),
  partner_note     text check (char_length(partner_note) <= 1000),
  updated_at       timestamptz not null default now(),
  unique (request_id, partner_id)
);
create index insurance_request_partners_partner_idx on public.insurance_request_partners (partner_id, status);

create table public.insurance_quotes (
  id                 uuid primary key default gen_random_uuid(),
  request_partner_id uuid not null references public.insurance_request_partners (id) on delete cascade,
  partner_id         uuid not null references public.insurance_partners (id) on delete cascade,
  product_name       text not null check (char_length(product_name) between 2 and 160),
  annual_premium_cents integer not null check (annual_premium_cents between 1000 and 100000000),
  coverages          text not null check (char_length(coverages) between 5 and 2000),
  deductibles        text check (char_length(deductibles) <= 1000),
  limits             text check (char_length(limits) <= 1000),
  exclusions         text check (char_length(exclusions) <= 2000),
  duration_months    integer not null check (duration_months between 1 and 36),
  documents_url      text not null check (documents_url ~ '^https://'),
  purchase_url       text check (purchase_url ~ '^https://'),
  valid_until        date not null,
  source             text not null check (source in ('partner', 'integrazione')),
  external_ref       text check (char_length(external_ref) <= 200),
  status             text not null default 'valido' check (status in ('valido', 'ritirato')),
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);

create table public.insurance_request_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.insurance_quote_requests (id) on delete cascade,
  partner_id  uuid references public.insurance_partners (id) on delete set null,
  actor_id    uuid references public.profiles (id) on delete set null,
  event       text not null,
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index insurance_events_request_idx on public.insurance_request_events (request_id, created_at);
create trigger insurance_events_immutable before update or delete on public.insurance_request_events for each row execute function private.audit_logs_immutable();

create or replace function private.is_insurance_partner_user(_partner uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.insurance_partner_users u join public.insurance_partners p on p.id = u.partner_id
                     where u.partner_id = _partner and u.user_id = (select auth.uid()) and p.status = 'verificato'); $$;

create or replace function private.owns_insurance_request(_req uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.insurance_quote_requests q where q.id = _req and q.user_id = (select auth.uid())); $$;

create or replace function private.partner_sees_insurance_request(_req uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.insurance_request_partners rp where rp.request_id = _req and rp.status <> 'ritirata' and private.is_insurance_partner_user(rp.partner_id)); $$;

create or replace function private.insurance_event(_req uuid, _partner uuid, _event text, _note text)
returns void language sql security definer set search_path = ''
as $$ insert into public.insurance_request_events (request_id, partner_id, actor_id, event, note) values (_req, _partner, auth.uid(), _event, nullif(trim(_note), '')); $$;

-- Richiesta di preventivo: un consenso per ogni partner scelto (solo partner verificati).
create or replace function public.create_insurance_request(p_vehicle_make text, p_vehicle_model text, p_coverages text[], p_province text, p_partner_ids uuid[],
  p_consent boolean, p_vehicle_year integer default null, p_fuel text default null, p_power_kw integer default null, p_registration_date date default null,
  p_plate text default null, p_postal_code text default null, p_desired_start date default null, p_contact_channel text default 'piattaforma',
  p_contact_phone text default null, p_notes text default null, p_user_vehicle_id uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _p uuid; _u record;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per inviare la richiesta' using errcode = '42501'; end if;
  if not coalesce(p_consent, false) then raise exception 'Serve il consenso esplicito alla trasmissione dei dati ai partner scelti' using errcode = '22023'; end if;
  if coalesce(cardinality(p_partner_ids), 0) = 0 or cardinality(p_partner_ids) > 5 then raise exception 'Scegli da 1 a 5 partner' using errcode = '22023'; end if;
  if p_contact_channel = 'telefono' and coalesce(trim(p_contact_phone), '') = '' then raise exception 'Indica il telefono per essere ricontattato' using errcode = '22023'; end if;
  if p_user_vehicle_id is not null and not exists (select 1 from public.user_vehicles v where v.id = p_user_vehicle_id and v.owner_id = auth.uid() and v.deleted_at is null) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  perform private.enforce_rate_limit('insurance_request', 5, interval '1 day');
  insert into public.insurance_quote_requests (user_id, user_vehicle_id, vehicle_make, vehicle_model, vehicle_year, fuel, power_kw, registration_date, plate,
    coverages, province, postal_code, desired_start, contact_channel, contact_phone, notes)
  values (auth.uid(), p_user_vehicle_id, trim(p_vehicle_make), trim(p_vehicle_model), p_vehicle_year, p_fuel, p_power_kw, p_registration_date,
    nullif(upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g')), ''), p_coverages, upper(trim(p_province)), p_postal_code, p_desired_start,
    coalesce(p_contact_channel, 'piattaforma'), nullif(trim(p_contact_phone), ''), nullif(trim(p_notes), ''))
  returning id into _id;
  foreach _p in array p_partner_ids loop
    if not exists (select 1 from public.insurance_partners where id = _p and status = 'verificato') then
      raise exception 'Uno dei partner scelti non è disponibile' using errcode = '22023';
    end if;
    insert into public.insurance_request_partners (request_id, partner_id) values (_id, _p);
    perform private.insurance_event(_id, _p, 'consenso_trasmissione', null);
    for _u in select user_id from public.insurance_partner_users where partner_id = _p loop
      perform private.notify(_u.user_id, 'richieste', 'Nuova richiesta di preventivo auto', trim(p_vehicle_make) || ' ' || trim(p_vehicle_model) || ' · ' || upper(trim(p_province)),
        '/dashboard/assicurazioni/partner', 'ins-req:' || _id || ':' || _p);
    end loop;
  end loop;
  return _id;
end;
$$;

-- Ritiro della richiesta (i partner sono avvisati) ed eliminazione dei dati dalla piattaforma.
create or replace function public.withdraw_insurance_request(request_id uuid, delete_data boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.insurance_quote_requests%rowtype; _u record;
begin
  select * into _r from public.insurance_quote_requests q where q.id = withdraw_insurance_request.request_id and q.user_id = auth.uid() for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status = 'inviata' then
    update public.insurance_quote_requests set status = 'ritirata' where id = _r.id;
    update public.insurance_request_partners rp set status = 'ritirata', updated_at = now() where rp.request_id = _r.id and rp.status not in ('ritirata', 'chiusa');
    perform private.insurance_event(_r.id, null, 'ritirata', null);
    for _u in select pu.user_id from public.insurance_request_partners rp join public.insurance_partner_users pu on pu.partner_id = rp.partner_id where rp.request_id = _r.id loop
      perform private.notify(_u.user_id, 'richieste', 'Richiesta di preventivo ritirata', 'Il cliente ha ritirato la richiesta: non utilizzare più i dati ricevuti se non per obblighi di legge.',
        '/dashboard/assicurazioni/partner', 'ins-wd:' || _r.id || ':' || _u.user_id);
    end loop;
  end if;
  if coalesce(delete_data, false) then
    delete from public.insurance_quote_requests where id = _r.id;
  end if;
end;
$$;

create or replace function public.partner_update_insurance_request(request_partner_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _rp public.insurance_request_partners%rowtype; _user uuid;
begin
  select * into _rp from public.insurance_request_partners where id = request_partner_id for update;
  if not found or not private.is_insurance_partner_user(_rp.partner_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _rp.status in ('ritirata', 'chiusa') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  if new_status not in ('in_lavorazione', 'non_quotabile', 'chiusa') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  update public.insurance_request_partners set status = new_status, partner_note = nullif(trim(note), ''), updated_at = now() where id = _rp.id;
  perform private.insurance_event(_rp.request_id, _rp.partner_id, new_status, note);
  select user_id into _user from public.insurance_quote_requests where id = _rp.request_id;
  perform private.notify(_user, 'preventivi', 'Aggiornamento sulla richiesta assicurativa', (select name from public.insurance_partners where id = _rp.partner_id) || ': ' || replace(new_status, '_', ' '),
    '/dashboard/assicurazioni/' || _rp.request_id, 'ins-st:' || _rp.id || ':' || new_status);
end;
$$;

-- Preventivo: inserito dal partner verificato (o da un'integrazione ufficiale tramite service_role).
create or replace function public.submit_insurance_quote(request_partner_id uuid, product_name text, annual_premium_cents integer, coverages text,
  duration_months integer, documents_url text, valid_until date, deductibles text default null, limits text default null, exclusions text default null,
  purchase_url text default null, external_ref text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _rp public.insurance_request_partners%rowtype; _q uuid; _user uuid; _src text;
begin
  select * into _rp from public.insurance_request_partners where id = request_partner_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then _src := 'integrazione';
    if not exists (select 1 from public.insurance_integrations i where i.partner_id = _rp.partner_id and i.status in ('attivo', 'in_test') and i.kind in ('api', 'webhook')) then
      raise exception 'Nessuna integrazione attiva per questo partner' using errcode = '42501';
    end if;
  elsif private.is_insurance_partner_user(_rp.partner_id) then _src := 'partner';
  else raise exception 'Richiesta non trovata' using errcode = 'P0002';
  end if;
  if _rp.status in ('ritirata', 'chiusa', 'non_quotabile') then raise exception 'La richiesta non accetta preventivi' using errcode = '22023'; end if;
  if valid_until < current_date then raise exception 'Validità non valida' using errcode = '22023'; end if;
  insert into public.insurance_quotes (request_partner_id, partner_id, product_name, annual_premium_cents, coverages, deductibles, limits, exclusions,
    duration_months, documents_url, purchase_url, valid_until, source, external_ref, created_by)
  values (_rp.id, _rp.partner_id, trim(product_name), annual_premium_cents, trim(coverages), nullif(trim(deductibles), ''), nullif(trim(limits), ''),
    nullif(trim(exclusions), ''), duration_months, documents_url, purchase_url, valid_until, _src, external_ref, auth.uid())
  returning id into _q;
  update public.insurance_request_partners set status = 'preventivo_disponibile', updated_at = now() where id = _rp.id;
  perform private.insurance_event(_rp.request_id, _rp.partner_id, 'preventivo_ricevuto', _src);
  select user_id into _user from public.insurance_quote_requests where id = _rp.request_id;
  perform private.notify(_user, 'preventivi', 'Preventivo assicurativo disponibile', (select name from public.insurance_partners where id = _rp.partner_id) || ' · ' || trim(product_name),
    '/dashboard/assicurazioni/' || _rp.request_id, 'ins-q:' || _q);
  return _q;
end;
$$;

create or replace function public.admin_set_insurance_partner_status(partner_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('insurance.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if new_status not in ('bozza', 'in_verifica', 'verificato', 'sospeso') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  if new_status = 'sospeso' and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  update public.insurance_partners p set status = new_status, status_note = nullif(trim(note), ''),
    verified_by = case when new_status = 'verificato' then auth.uid() else p.verified_by end,
    verified_at = case when new_status = 'verificato' then now() else p.verified_at end
   where p.id = admin_set_insurance_partner_status.partner_id;
  if not found then raise exception 'Partner non trovato' using errcode = 'P0002'; end if;
  perform private.log_admin_action('insurance_partner.' || new_status, 'insurance_partners', partner_id::text, jsonb_build_object('note', note));
end;
$$;

create or replace function public.admin_add_insurance_partner_user(partner_id uuid, user_email text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _u uuid;
begin
  if not private.has_permission('insurance.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  select id into _u from auth.users where lower(email) = lower(trim(user_email));
  if _u is null then raise exception 'Nessun account con questa email: il referente deve prima registrarsi' using errcode = 'P0002'; end if;
  insert into public.insurance_partner_users (partner_id, user_id, added_by) values (admin_add_insurance_partner_user.partner_id, _u, auth.uid()) on conflict do nothing;
  perform private.log_admin_action('insurance_partner.add_user', 'insurance_partners', partner_id::text, jsonb_build_object('user_id', _u));
end;
$$;

-- RLS assicurazioni ------------------------------------------------------
alter table public.insurance_partners enable row level security;
alter table public.insurance_partner_users enable row level security;
alter table public.insurance_integrations enable row level security;
alter table public.insurance_quote_requests enable row level security;
alter table public.insurance_request_partners enable row level security;
alter table public.insurance_quotes enable row level security;
alter table public.insurance_request_events enable row level security;
revoke all on public.insurance_partners, public.insurance_partner_users, public.insurance_integrations, public.insurance_quote_requests,
  public.insurance_request_partners, public.insurance_quotes, public.insurance_request_events from anon, authenticated;
grant all on public.insurance_partners, public.insurance_partner_users, public.insurance_integrations, public.insurance_quote_requests,
  public.insurance_request_partners, public.insurance_quotes, public.insurance_request_events to service_role;

grant select on public.insurance_partners to anon, authenticated;
grant insert, update on public.insurance_partners to authenticated;
create policy "insurance_partners: verificati pubblici" on public.insurance_partners for select to anon, authenticated using (status = 'verificato');
create policy "insurance_partners: staff" on public.insurance_partners for all to authenticated
  using (private.has_permission('insurance.manage')) with check (private.has_permission('insurance.manage') and (status <> 'verificato' or verified_at is not null));
create policy "insurance_partners: referenti" on public.insurance_partners for select to authenticated
  using (exists (select 1 from public.insurance_partner_users u where u.partner_id = insurance_partners.id and u.user_id = (select auth.uid())));

grant select, insert, delete on public.insurance_partner_users to authenticated;
create policy "insurance_partner_users: staff" on public.insurance_partner_users for all to authenticated
  using (private.has_permission('insurance.manage')) with check (private.has_permission('insurance.manage'));
create policy "insurance_partner_users: se stesso" on public.insurance_partner_users for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.insurance_integrations to authenticated;
create policy "insurance_integrations: staff" on public.insurance_integrations for all to authenticated
  using (private.has_permission('insurance.manage')) with check (private.has_permission('insurance.manage'));

grant select on public.insurance_quote_requests, public.insurance_request_partners, public.insurance_quotes, public.insurance_request_events to authenticated;
create policy "insurance_requests: titolare" on public.insurance_quote_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "insurance_requests: partner con consenso" on public.insurance_quote_requests for select to authenticated
  using (private.partner_sees_insurance_request(id));
create policy "insurance_requests: staff" on public.insurance_quote_requests for select to authenticated using (private.has_permission('insurance.manage'));
create policy "insurance_rp: titolare, partner, staff" on public.insurance_request_partners for select to authenticated
  using (private.owns_insurance_request(request_id) or private.is_insurance_partner_user(partner_id) or private.has_permission('insurance.manage'));
create policy "insurance_quotes: titolare, partner, staff" on public.insurance_quotes for select to authenticated
  using (exists (select 1 from public.insurance_request_partners rp join public.insurance_quote_requests q on q.id = rp.request_id
                 where rp.id = request_partner_id and q.user_id = (select auth.uid()))
         or private.is_insurance_partner_user(partner_id) or private.has_permission('insurance.manage'));
create policy "insurance_events: titolare, partner, staff" on public.insurance_request_events for select to authenticated
  using (private.owns_insurance_request(request_id)
         or (partner_id is not null and private.is_insurance_partner_user(partner_id)) or private.has_permission('insurance.manage'));

revoke all on function public.create_insurance_request(text, text, text[], text, uuid[], boolean, integer, text, integer, date, text, text, date, text, text, text, uuid) from public, anon;
grant execute on function public.create_insurance_request(text, text, text[], text, uuid[], boolean, integer, text, integer, date, text, text, date, text, text, text, uuid) to authenticated;
revoke all on function public.withdraw_insurance_request(uuid, boolean) from public, anon;
grant execute on function public.withdraw_insurance_request(uuid, boolean) to authenticated;
revoke all on function public.partner_update_insurance_request(uuid, text, text) from public, anon;
grant execute on function public.partner_update_insurance_request(uuid, text, text) to authenticated;
revoke all on function public.submit_insurance_quote(uuid, text, integer, text, integer, text, date, text, text, text, text, text) from public, anon;
grant execute on function public.submit_insurance_quote(uuid, text, integer, text, integer, text, date, text, text, text, text, text) to authenticated, service_role;
revoke all on function public.admin_set_insurance_partner_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_insurance_partner_status(uuid, text, text) to authenticated;
revoke all on function public.admin_add_insurance_partner_user(uuid, text) from public, anon;
grant execute on function public.admin_add_insurance_partner_user(uuid, text) to authenticated;
grant execute on function private.is_insurance_partner_user(uuid), private.owns_insurance_request(uuid), private.partner_sees_insurance_request(uuid) to authenticated, service_role;

-- =====================================================================
-- FASE 25 — REVISIONI
-- =====================================================================
-- Regole di periodicità (art. 80 D.Lgs. 285/1992), modificabili dallo staff senza rilascio di codice.
insert into public.platform_settings (key, value, description) values
  ('inspection_rules', jsonb_build_object(
     'source', 'Art. 80 D.Lgs. 30 aprile 1992, n. 285 (Codice della Strada), comma 4; mit.gov.it «Revisione periodica veicoli»',
     'source_url', 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285~art80',
     'checked_on', '2026-11-20',
     'standard_first_years', 4, 'standard_next_years', 2,
     'annual_categories', jsonb_build_array('pesante', 'autobus', 'rimorchio_pesante'),
     'annual_uses', jsonb_build_array('taxi', 'ncc', 'ambulanza'),
     'repeat_months', 1),
   'Periodicità delle revisioni: prima dopo 4 anni, poi ogni 2; annuale per >3,5 t, autobus, taxi, NCC, ambulanze. Aggiornare con fonte e data se la norma cambia.')
on conflict (key) do nothing;

alter table public.user_vehicles
  add column inspection_category text not null default 'autovettura'
    check (inspection_category in ('autovettura', 'moto', 'ciclomotore', 'leggero_merci', 'pesante', 'autobus', 'rimorchio_leggero', 'rimorchio_pesante')),
  add column usage_type text not null default 'privato' check (usage_type in ('privato', 'taxi', 'ncc', 'ambulanza', 'noleggio_senza_conducente', 'altro'));

-- Calcolo della prossima scadenza: fine del mese di riferimento. Restituisce null se mancano i dati.
create or replace function public.inspection_due_date(p_category text, p_usage text, p_registration_date date, p_last_date date default null, p_last_outcome text default null)
returns table (due_date date, rule text, source text, checked_on text)
language plpgsql stable security definer set search_path = ''
as $$
declare _r jsonb := private.setting('inspection_rules'); _annual boolean; _base date;
begin
  _annual := (_r -> 'annual_categories') ? coalesce(p_category, 'autovettura') or (_r -> 'annual_uses') ? coalesce(p_usage, 'privato');
  source := _r ->> 'source'; checked_on := _r ->> 'checked_on';
  if p_last_date is not null and p_last_outcome = 'ripetere' then
    due_date := p_last_date + make_interval(months => coalesce((_r ->> 'repeat_months')::integer, 1));
    rule := 'Esito «ripetere»: nuova revisione entro un mese'; return next; return;
  elsif p_last_date is not null and p_last_outcome = 'sospeso' then
    due_date := p_last_date; rule := 'Esito «sospeso»: il veicolo non può circolare fino al superamento della revisione'; return next; return;
  elsif p_last_date is not null then
    _base := p_last_date + make_interval(years => case when _annual then 1 else (_r ->> 'standard_next_years')::integer end);
    rule := case when _annual then 'Revisione annuale (categoria o uso del veicolo)' else 'Revisione ogni 2 anni dall''ultima' end;
  elsif p_registration_date is not null then
    _base := p_registration_date + make_interval(years => case when _annual then 1 else (_r ->> 'standard_first_years')::integer end);
    rule := case when _annual then 'Prima revisione dopo 1 anno (categoria o uso del veicolo)' else 'Prima revisione dopo 4 anni dall''immatricolazione' end;
  else
    return;
  end if;
  due_date := (date_trunc('month', _base) + interval '1 month - 1 day')::date;
  return next;
end;
$$;
grant execute on function public.inspection_due_date(text, text, date, date, text) to anon, authenticated, service_role;

create table public.inspection_centers (
  profile_id        uuid primary key references public.professional_profiles (id) on delete cascade,
  vehicle_categories text[] not null check (cardinality(vehicle_categories) >= 1 and vehicle_categories <@ array['autovettura', 'moto', 'ciclomotore', 'leggero_merci',
                       'pesante', 'autobus', 'rimorchio_leggero', 'rimorchio_pesante']::text[]),
  services          text[] not null default '{revisione}' check (services <@ array['revisione', 'pre_revisione', 'collaudo', 'controllo_gas', 'ritiro_consegna']::text[]),
  hours_text        text check (char_length(hours_text) <= 300),
  price_notes       text check (char_length(price_notes) <= 500),
  status            text not null default 'in_revisione' check (status in ('in_revisione', 'attivo', 'sospeso', 'rifiutato')),
  admin_note        text check (char_length(admin_note) <= 500),
  verified_at       timestamptz,
  verified_by       uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger inspection_centers_updated before update on public.inspection_centers for each row execute function private.set_updated_at();

create or replace function private.inspection_centers_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _type public.app_role;
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  select professional_type into _type from public.professional_profiles where id = new.profile_id;
  if _type is null or _type::text not in ('centro_revisione', 'officina') then
    raise exception 'Il servizio revisioni è disponibile per centri revisione e officine' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.status := 'in_revisione'; new.verified_at := null; new.verified_by := null; new.admin_note := null;
    perform private.notify_staff('services.manage', 'Nuovo centro revisione da verificare', (select display_name from public.professional_profiles where id = new.profile_id),
      '/admin/servizi?tab=revisioni', 'insp-center:' || new.profile_id);
  else
    new.status := old.status; new.verified_at := old.verified_at; new.verified_by := old.verified_by; new.admin_note := old.admin_note;
  end if;
  return new;
end;
$$;
create trigger inspection_centers_guard before insert or update on public.inspection_centers for each row execute function private.inspection_centers_guard();

-- Autorizzazione ministeriale (concessione art. 80 c. 8 CdS): caricata dal centro, verificata dallo staff.
create table public.inspection_authorizations (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.inspection_centers (profile_id) on delete cascade,
  authority            text not null check (char_length(authority) between 3 and 160),
  authorization_number text not null check (char_length(authorization_number) between 2 and 60),
  categories           text[] not null check (cardinality(categories) >= 1),
  issued_on            date,
  valid_until          date,
  document_path        text not null check (document_path ~ '^[0-9a-f-]+/[0-9a-f-]+\.(pdf|jpg|png|webp)$'),
  status               text not null default 'in_verifica' check (status in ('in_verifica', 'verificata', 'respinta')),
  review_note          text check (char_length(review_note) <= 500),
  reviewed_by          uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index inspection_auth_profile_idx on public.inspection_authorizations (profile_id);

create or replace function private.inspection_auth_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if tg_op = 'UPDATE' then raise exception 'Un''autorizzazione inviata non si modifica: caricane una nuova' using errcode = '42501'; end if;
  if split_part(new.document_path, '/', 1) <> auth.uid()::text then raise exception 'Documento non valido' using errcode = '42501'; end if;
  new.status := 'in_verifica'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
  perform private.notify_staff('services.manage', 'Autorizzazione revisioni da verificare', new.authorization_number, '/admin/servizi?tab=revisioni', 'insp-auth:' || new.id);
  return new;
end;
$$;
create trigger inspection_auth_guard before insert or update on public.inspection_authorizations for each row execute function private.inspection_auth_guard();

create or replace function private.inspection_center_authorized(_profile uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.inspection_authorizations a where a.profile_id = _profile and a.status = 'verificata'
                     and (a.valid_until is null or a.valid_until >= current_date)); $$;

create table public.inspection_appointments (
  id                 uuid primary key default gen_random_uuid(),
  center_profile_id  uuid not null references public.inspection_centers (profile_id) on delete cascade,
  center_owner_id    uuid not null references public.profiles (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  user_vehicle_id    uuid references public.user_vehicles (id) on delete set null,
  vehicle_desc       text not null check (char_length(vehicle_desc) between 3 and 120),
  vehicle_category   text not null default 'autovettura',
  plate              text check (plate ~ '^[A-Z0-9]{5,10}$'),
  starts_at          timestamptz,
  ends_at            timestamptz,
  preferred_date     date,
  preferred_time     text check (char_length(preferred_time) <= 80),
  proposed_starts_at timestamptz,
  message            text check (char_length(message) <= 1000),
  status             text not null default 'richiesta' check (status in ('richiesta', 'confermato', 'modifica_proposta', 'rifiutato', 'annullato', 'completato', 'mancata_presentazione')),
  decision_note      text check (char_length(decision_note) <= 500),
  conversation_id    uuid references public.conversations (id) on delete set null,
  reminded_24h       boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (starts_at is not null or preferred_date is not null),
  check ((starts_at is null) = (ends_at is null))
);
create index inspection_appts_center_idx on public.inspection_appointments (center_profile_id, starts_at);
create index inspection_appts_user_idx on public.inspection_appointments (user_id, created_at desc);
create unique index inspection_appts_slot_uniq on public.inspection_appointments (center_owner_id, starts_at) where status = 'confermato' and starts_at is not null;
create trigger inspection_appts_updated before update on public.inspection_appointments for each row execute function private.set_updated_at();

create table public.inspection_records (
  id                  uuid primary key default gen_random_uuid(),
  user_vehicle_id     uuid not null references public.user_vehicles (id) on delete cascade,
  owner_id            uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  inspected_on        date not null,
  outcome             text not null check (outcome in ('regolare', 'ripetere', 'sospeso')),
  mileage_km          integer check (mileage_km between 0 and 2000000),
  center_profile_id   uuid references public.professional_profiles (id) on delete set null,
  center_name         text check (char_length(center_name) <= 160),
  document_path       text check (document_path ~ '^[0-9a-f-]+/[0-9a-f-]+\.(pdf|jpg|png|webp)$'),
  verification        text not null default 'dichiarato' check (verification in ('dichiarato', 'documento_allegato', 'confermato_centro')),
  appointment_id      uuid references public.inspection_appointments (id) on delete set null,
  next_due_date       date,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  notes               text check (char_length(notes) <= 1000),
  created_at          timestamptz not null default now()
);
create index inspection_records_vehicle_idx on public.inspection_records (user_vehicle_id, inspected_on desc);

-- Dopo ogni revisione registrata: storico manutenzione + promemoria della prossima scadenza (Fase 20).
create or replace function private.inspection_record_after()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _v public.user_vehicles%rowtype; _due date; _mr uuid; _rem uuid;
begin
  select * into _v from public.user_vehicles where id = new.user_vehicle_id;
  select d.due_date into _due from public.inspection_due_date(_v.inspection_category, _v.usage_type, _v.registration_date, new.inspected_on, new.outcome) d;
  insert into public.maintenance_records (user_vehicle_id, owner_id, title, category, performed_on, mileage_km, description, provider_name, professional_profile_id, source)
  values (new.user_vehicle_id, new.owner_id, 'Revisione periodica — esito ' || new.outcome, 'revisione', new.inspected_on, new.mileage_km,
    case new.verification when 'confermato_centro' then 'Esito confermato dal centro revisione' when 'documento_allegato' then 'Esito dichiarato con documento allegato' else 'Esito dichiarato dal proprietario' end,
    new.center_name, case when new.verification = 'confermato_centro' then new.center_profile_id end,
    case when new.verification = 'confermato_centro' then 'professionista' else 'manuale' end::public.record_source)
  returning id into _mr;
  update public.inspection_records set next_due_date = _due, maintenance_record_id = _mr where id = new.id;
  if new.mileage_km is not null and new.mileage_km > coalesce(_v.current_mileage_km, 0) then
    update public.user_vehicles set current_mileage_km = new.mileage_km where id = _v.id;
  end if;
  if _due is not null then
    select id into _rem from public.maintenance_reminders where user_vehicle_id = new.user_vehicle_id and category = 'revisione' and status <> 'disattivato' order by created_at desc limit 1;
    if _rem is null then
      insert into public.maintenance_reminders (owner_id, user_vehicle_id, title, category, description, due_date, notify_days_before)
      values (new.owner_id, new.user_vehicle_id, 'Revisione periodica', 'revisione', 'Scadenza calcolata secondo l''art. 80 del Codice della Strada', _due, 30);
    else
      update public.maintenance_reminders set due_date = _due, status = 'attivo', last_notified_on = null, last_notified_kind = null where id = _rem;
    end if;
  end if;
  return null;
end;
$$;
create trigger inspection_records_after after insert on public.inspection_records for each row execute function private.inspection_record_after();

create or replace function private.inspection_records_before()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if not exists (select 1 from public.user_vehicles v where v.id = new.user_vehicle_id and v.owner_id = auth.uid() and v.deleted_at is null) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  if new.inspected_on > current_date then raise exception 'La data della revisione non può essere futura' using errcode = '22023'; end if;
  if new.document_path is not null and split_part(new.document_path, '/', 1) <> auth.uid()::text then raise exception 'Documento non valido' using errcode = '42501'; end if;
  new.owner_id := auth.uid(); new.appointment_id := null; new.next_due_date := null; new.maintenance_record_id := null;
  new.verification := case when new.document_path is not null then 'documento_allegato' else 'dichiarato' end;
  return new;
end;
$$;
create trigger inspection_records_before before insert on public.inspection_records for each row execute function private.inspection_records_before();

-- Orari disponibili del centro: derivano dalla disponibilità configurata (stesse tabelle della Fase 27).
create or replace function private.owner_busy(_owner uuid, _start timestamptz, _end timestamptz, _exclude uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.booking_blocks b where b.owner_id = _owner and tstzrange(b.starts_at, b.ends_at) && tstzrange(_start, _end))
      or exists (select 1 from public.vehicle_bookings vb where vb.seller_id = _owner and vb.status in ('confermato', 'in_attesa', 'modifica_proposta')
                 and tstzrange(vb.starts_at, vb.ends_at) && tstzrange(_start, _end))
      or exists (select 1 from public.inspection_appointments ia where ia.center_owner_id = _owner and ia.id is distinct from _exclude and ia.starts_at is not null
                 and ia.status in ('richiesta', 'confermato', 'modifica_proposta') and tstzrange(ia.starts_at, ia.ends_at) && tstzrange(_start, _end));
$$;

-- Le prenotazioni auto tengono conto anche degli appuntamenti di revisione dello stesso titolare.
create or replace function private.slot_is_free(_seller uuid, _start timestamptz, _end timestamptz, _exclude uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.vehicle_bookings vb where vb.seller_id = _seller and vb.id is distinct from _exclude
                      and vb.status in ('confermato', 'in_attesa', 'modifica_proposta') and tstzrange(vb.starts_at, vb.ends_at) && tstzrange(_start, _end))
     and not exists (select 1 from public.booking_blocks b where b.owner_id = _seller and tstzrange(b.starts_at, b.ends_at) && tstzrange(_start, _end))
     and not exists (select 1 from public.inspection_appointments ia where ia.center_owner_id = _seller and ia.starts_at is not null
                      and ia.status in ('richiesta', 'confermato', 'modifica_proposta') and tstzrange(ia.starts_at, ia.ends_at) && tstzrange(_start, _end))
$$;

create or replace function public.inspection_slots(profile_id uuid, from_date date default null, days integer default 14)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare _owner uuid; _s public.booking_settings%rowtype; _d date; _a record; _t timestamp; _start timestamptz;
        _first date := coalesce(from_date, (now() at time zone 'Europe/Rome')::date);
begin
  select pp.user_id into _owner from public.inspection_centers c join public.professional_profiles pp on pp.id = c.profile_id
   where c.profile_id = inspection_slots.profile_id and c.status = 'attivo' and private.profile_is_public(c.profile_id);
  if _owner is null then return; end if;
  select * into _s from public.booking_settings where owner_id = _owner;
  if not found then return; end if;
  for _d in select generate_series(_first, _first + least(greatest(days, 1), _s.max_days_ahead) - 1, interval '1 day')::date loop
    for _a in select * from public.booking_availability where owner_id = _owner and weekday = extract(isodow from _d) order by start_time loop
      _t := _d + _a.start_time;
      while _t + make_interval(mins => _s.slot_minutes) <= _d + _a.end_time loop
        _start := _t at time zone 'Europe/Rome';
        if _start >= now() + make_interval(hours => _s.min_notice_hours) and _start <= now() + make_interval(days => _s.max_days_ahead)
           and not private.owner_busy(_owner, _start, _start + make_interval(mins => _s.slot_minutes), null) then
          starts_at := _start; ends_at := _start + make_interval(mins => _s.slot_minutes); return next;
        end if;
        _t := _t + make_interval(mins => _s.slot_minutes);
      end loop;
    end loop;
  end loop;
end;
$$;
grant execute on function public.inspection_slots(uuid, date, integer) to anon, authenticated;

create or replace function public.search_inspection_centers(p_lat double precision default null, p_lng double precision default null, p_radius_km integer default 25,
  p_city text default null, p_category text default null)
returns table (profile_id uuid, slug text, display_name text, address text, city text, phone text, latitude double precision, longitude double precision,
               distance_km numeric, vehicle_categories text[], services text[], hours_text text, price_notes text, authorized boolean,
               rating_avg numeric, review_count integer, online_booking boolean)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.slug, pp.display_name, case when pp.show_address then pp.address_line end, pp.city, pp.phone_public, pp.latitude, pp.longitude,
         case when p_lat is not null and pp.latitude is not null then round(private.distance_km(p_lat, p_lng, pp.latitude, pp.longitude)::numeric, 1) end,
         c.vehicle_categories, c.services, c.hours_text, c.price_notes, private.inspection_center_authorized(pp.id),
         (select round(avg(rv.rating)::numeric, 1) from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata'),
         (select count(*)::integer from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata'),
         exists (select 1 from public.booking_settings bs join public.booking_availability ba on ba.owner_id = bs.owner_id where bs.owner_id = pp.user_id)
  from public.inspection_centers c join public.professional_profiles pp on pp.id = c.profile_id
  where c.status = 'attivo' and private.profile_is_public(c.profile_id)
    and (p_category is null or p_category = any (c.vehicle_categories))
    and (p_city is null or p_lat is not null or lower(pp.city) = lower(trim(p_city)))
    and (p_lat is null or (pp.latitude is not null and private.distance_km(p_lat, p_lng, pp.latitude, pp.longitude) <= least(greatest(coalesce(p_radius_km, 25), 1), 200)))
  order by 9 nulls last, private.inspection_center_authorized(pp.id) desc, pp.display_name
  limit 100;
$$;
grant execute on function public.search_inspection_centers(double precision, double precision, integer, text, text) to anon, authenticated;

create or replace function public.request_inspection(center_profile_id uuid, vehicle_desc text, starts_at timestamptz default null, preferred_date date default null,
  preferred_time text default null, user_vehicle_id uuid default null, plate text default null, vehicle_category text default 'autovettura', message text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _owner uuid; _s public.booking_settings%rowtype; _id uuid; _end timestamptz; _conv uuid; _name text;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per prenotare' using errcode = '42501'; end if;
  select pp.user_id, pp.display_name into _owner, _name from public.inspection_centers c join public.professional_profiles pp on pp.id = c.profile_id
   where c.profile_id = request_inspection.center_profile_id and c.status = 'attivo' and private.profile_is_public(c.profile_id);
  if _owner is null then raise exception 'Centro non disponibile' using errcode = 'P0002'; end if;
  if _owner = auth.uid() then raise exception 'Non puoi prenotare presso il tuo centro' using errcode = '22023'; end if;
  if user_vehicle_id is not null and not exists (select 1 from public.user_vehicles v where v.id = request_inspection.user_vehicle_id and v.owner_id = auth.uid() and v.deleted_at is null) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  perform private.enforce_rate_limit('inspection_request', 6, interval '1 day');
  if starts_at is not null then
    perform pg_advisory_xact_lock(hashtextextended('booking:' || _owner::text, 0));
    select * into _s from public.booking_settings where owner_id = _owner;
    if not found or not exists (select 1 from public.inspection_slots(center_profile_id, (starts_at at time zone 'Europe/Rome')::date, 1) sl where sl.starts_at = request_inspection.starts_at) then
      raise exception 'L''orario scelto non è più disponibile' using errcode = '23505';
    end if;
    _end := starts_at + make_interval(mins => _s.slot_minutes);
  elsif preferred_date is null or preferred_date < current_date then
    raise exception 'Indica una data preferita valida' using errcode = '22023';
  end if;
  _conv := private.open_service_conversation(auth.uid(), _owner, center_profile_id, 'Revisione — ' || trim(vehicle_desc),
    'Richiesta di revisione per ' || trim(vehicle_desc) || coalesce(E'\nOrario richiesto: ' || to_char(starts_at at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI'), '')
    || coalesce(E'\nData preferita: ' || to_char(preferred_date, 'DD/MM/YYYY') || coalesce(' (' || preferred_time || ')', ''), '') || coalesce(E'\n\n' || nullif(trim(message), ''), ''));
  insert into public.inspection_appointments (center_profile_id, center_owner_id, user_id, user_vehicle_id, vehicle_desc, vehicle_category, plate, starts_at, ends_at,
    preferred_date, preferred_time, message, conversation_id)
  values (center_profile_id, _owner, auth.uid(), user_vehicle_id, trim(vehicle_desc), coalesce(vehicle_category, 'autovettura'),
    nullif(upper(regexp_replace(coalesce(plate, ''), '[^A-Za-z0-9]', '', 'g')), ''), starts_at, _end, preferred_date, nullif(trim(preferred_time), ''),
    nullif(trim(message), ''), _conv)
  returning id into _id;
  perform private.notify(_owner, 'appuntamenti', 'Nuova richiesta di revisione', trim(vehicle_desc), '/dashboard/revisioni/' || _id, 'insp-new:' || _id);
  return _id;
end;
$$;

create or replace function public.respond_inspection(appointment_id uuid, action text, new_starts_at timestamptz default null, note text default null,
  outcome text default null, mileage_km integer default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _a public.inspection_appointments%rowtype; _center boolean; _user boolean; _s public.booking_settings%rowtype; _len interval; _msg text; _to uuid; _date date;
begin
  select * into _a from public.inspection_appointments where id = appointment_id for update;
  if not found then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;
  _center := _a.center_owner_id = auth.uid(); _user := _a.user_id = auth.uid();
  if not _center and not _user then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;
  select * into _s from public.booking_settings where owner_id = _a.center_owner_id;
  _len := make_interval(mins => coalesce(_s.slot_minutes, 30));
  perform pg_advisory_xact_lock(hashtextextended('booking:' || _a.center_owner_id::text, 0));
  if _center and action = 'conferma' and _a.status = 'richiesta' then
    if _a.starts_at is null then raise exception 'Indica un orario: usa «proponi orario»' using errcode = '22023'; end if;
    if private.owner_busy(_a.center_owner_id, _a.starts_at, _a.ends_at, _a.id) and exists (select 1 from public.inspection_appointments x where x.center_owner_id = _a.center_owner_id
        and x.id <> _a.id and x.status = 'confermato' and x.starts_at = _a.starts_at) then
      raise exception 'Orario già occupato' using errcode = '23505';
    end if;
    update public.inspection_appointments set status = 'confermato', decision_note = nullif(trim(note), '') where id = _a.id;
    _msg := 'Appuntamento di revisione confermato'; _to := _a.user_id;
  elsif _center and action = 'proponi' and _a.status in ('richiesta', 'confermato') then
    if new_starts_at is null or new_starts_at < now() then raise exception 'Indica un nuovo orario futuro' using errcode = '22023'; end if;
    if private.owner_busy(_a.center_owner_id, new_starts_at, new_starts_at + _len, _a.id) then raise exception 'Il nuovo orario non è libero' using errcode = '23505'; end if;
    update public.inspection_appointments set status = 'modifica_proposta', proposed_starts_at = new_starts_at, decision_note = nullif(trim(note), '') where id = _a.id;
    _msg := 'Il centro propone un nuovo orario per la revisione'; _to := _a.user_id;
  elsif _center and action = 'rifiuta' and _a.status in ('richiesta', 'modifica_proposta') then
    update public.inspection_appointments set status = 'rifiutato', decision_note = nullif(trim(note), '') where id = _a.id;
    _msg := 'Richiesta di revisione rifiutata'; _to := _a.user_id;
  elsif _center and action = 'mancata_presentazione' and _a.status = 'confermato' and _a.starts_at < now() then
    update public.inspection_appointments set status = 'mancata_presentazione' where id = _a.id;
    _msg := 'Appuntamento di revisione segnato come mancata presentazione'; _to := _a.user_id;
  elsif _center and action = 'completa' and _a.status = 'confermato' then
    if outcome not in ('regolare', 'ripetere', 'sospeso') then raise exception 'Indica l''esito della revisione' using errcode = '22023'; end if;
    update public.inspection_appointments set status = 'completato' where id = _a.id;
    _date := coalesce((_a.starts_at at time zone 'Europe/Rome')::date, current_date);
    if _a.user_vehicle_id is not null then
      perform set_config('ag24.trusted', 'on', true);
      insert into public.inspection_records (user_vehicle_id, owner_id, inspected_on, outcome, mileage_km, center_profile_id, center_name, verification, appointment_id)
      values (_a.user_vehicle_id, _a.user_id, least(_date, current_date), outcome, respond_inspection.mileage_km, _a.center_profile_id,
              (select display_name from public.professional_profiles where id = _a.center_profile_id), 'confermato_centro', _a.id);
      perform set_config('ag24.trusted', 'off', true);
    end if;
    _msg := 'Revisione completata: esito ' || outcome; _to := _a.user_id;
  elsif _user and action = 'accetta_modifica' and _a.status = 'modifica_proposta' then
    if private.owner_busy(_a.center_owner_id, _a.proposed_starts_at, _a.proposed_starts_at + _len, _a.id) then raise exception 'L''orario proposto non è più libero' using errcode = '23505'; end if;
    update public.inspection_appointments set status = 'confermato', starts_at = _a.proposed_starts_at, ends_at = _a.proposed_starts_at + _len, proposed_starts_at = null where id = _a.id;
    _msg := 'Il cliente ha accettato il nuovo orario di revisione'; _to := _a.center_owner_id;
  elsif _user and action = 'rifiuta_modifica' and _a.status = 'modifica_proposta' then
    update public.inspection_appointments set status = 'richiesta', proposed_starts_at = null where id = _a.id;
    _msg := 'Il cliente non può nel nuovo orario proposto'; _to := _a.center_owner_id;
  elsif _user and action = 'modifica' and _a.status = 'richiesta' then
    if new_starts_at is not null then
      if not exists (select 1 from public.inspection_slots(_a.center_profile_id, (new_starts_at at time zone 'Europe/Rome')::date, 1) sl where sl.starts_at = new_starts_at) then
        raise exception 'L''orario scelto non è disponibile' using errcode = '23505';
      end if;
      update public.inspection_appointments set starts_at = new_starts_at, ends_at = new_starts_at + _len where id = _a.id;
    else raise exception 'Scegli un nuovo orario' using errcode = '22023';
    end if;
    _msg := 'Il cliente ha modificato l''orario richiesto'; _to := _a.center_owner_id;
  elsif action = 'annulla' and _a.status in ('richiesta', 'confermato', 'modifica_proposta') then
    update public.inspection_appointments set status = 'annullato', decision_note = nullif(trim(note), '') where id = _a.id;
    _msg := 'Appuntamento di revisione annullato'; _to := case when _user then _a.center_owner_id else _a.user_id end;
  else
    raise exception 'Operazione non consentita in questo stato' using errcode = '22023';
  end if;
  if _a.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body) values (_a.conversation_id, auth.uid(), 'sistema', _msg || coalesce(' — ' || nullif(trim(note), ''), ''));
  end if;
  perform private.notify(_to, 'appuntamenti', _msg, _a.vehicle_desc, '/dashboard/revisioni/' || _a.id, 'insp:' || _a.id || ':' || action || ':' || now()::text);
end;
$$;

-- Promemoria 24 h prima degli appuntamenti confermati (oltre ai promemoria di scadenza della Fase 20).
create or replace function private.process_inspection_reminders()
returns void language plpgsql security definer set search_path = ''
as $$
declare _a record;
begin
  for _a in select * from public.inspection_appointments where status = 'confermato' and not reminded_24h and starts_at between now() and now() + interval '24 hours' loop
    perform private.notify(_a.user_id, 'appuntamenti', 'Domani: revisione ' || _a.vehicle_desc,
      to_char(_a.starts_at at time zone 'Europe/Rome', 'DD/MM HH24:MI') || ' — porta la carta di circolazione', '/dashboard/revisioni/' || _a.id, 'insp-rem:' || _a.id);
    update public.inspection_appointments set reminded_24h = true where id = _a.id;
  end loop;
end;
$$;

create or replace function public.admin_review_inspection_authorization(authorization_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _a public.inspection_authorizations%rowtype; _user uuid;
begin
  if not private.has_permission('services.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if decision not in ('verificata', 'respinta') then raise exception 'Decisione non valida' using errcode = '22023'; end if;
  if coalesce(trim(note), '') = '' then raise exception 'Descrivi la verifica effettuata (fonte, data) o il motivo del rifiuto' using errcode = '22023'; end if;
  perform set_config('ag24.trusted', 'on', true);
  update public.inspection_authorizations set status = decision, review_note = trim(note), reviewed_by = auth.uid(), reviewed_at = now() where id = authorization_id returning * into _a;
  perform set_config('ag24.trusted', 'off', true);
  if _a.id is null then raise exception 'Autorizzazione non trovata' using errcode = 'P0002'; end if;
  select user_id into _user from public.professional_profiles where id = _a.profile_id;
  perform private.notify(_user, 'amministrazione', case decision when 'verificata' then 'Autorizzazione revisioni verificata' else 'Autorizzazione revisioni non verificata' end,
    trim(note), '/dashboard/revisioni/centro', 'insp-auth-rev:' || _a.id);
  perform private.log_admin_action('inspection_authorization.' || decision, 'inspection_authorizations', _a.id::text, jsonb_build_object('note', note));
end;
$$;

-- Estende la verifica degli operatori (Fase 23/28) ai centri revisione.
create or replace function public.admin_set_service_operator(kind text, profile_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _user uuid; _n integer := 0;
begin
  if not private.has_permission('services.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if new_status not in ('attivo', 'sospeso', 'rifiutato', 'in_revisione') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  if new_status in ('sospeso', 'rifiutato') and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  perform set_config('ag24.trusted', 'on', true);
  if kind = 'soccorso' then
    update public.roadside_operators o set status = new_status, admin_note = nullif(trim(note), ''),
      verified_at = case when new_status = 'attivo' then now() else o.verified_at end, verified_by = case when new_status = 'attivo' then auth.uid() else o.verified_by end
     where o.profile_id = admin_set_service_operator.profile_id;
    get diagnostics _n = row_count;
  elsif kind = 'trasporto' then
    update public.transport_operators o set status = new_status, admin_note = nullif(trim(note), ''),
      verified_at = case when new_status = 'attivo' then now() else o.verified_at end, verified_by = case when new_status = 'attivo' then auth.uid() else o.verified_by end
     where o.profile_id = admin_set_service_operator.profile_id;
    get diagnostics _n = row_count;
  elsif kind = 'revisione' then
    update public.inspection_centers o set status = new_status, admin_note = nullif(trim(note), ''),
      verified_at = case when new_status = 'attivo' then now() else o.verified_at end, verified_by = case when new_status = 'attivo' then auth.uid() else o.verified_by end
     where o.profile_id = admin_set_service_operator.profile_id;
    get diagnostics _n = row_count;
  end if;
  perform set_config('ag24.trusted', 'off', true);
  if _n = 0 then raise exception 'Operatore non trovato' using errcode = 'P0002'; end if;
  select user_id into _user from public.professional_profiles where id = admin_set_service_operator.profile_id;
  perform private.notify(_user, 'amministrazione', case new_status when 'attivo' then 'Servizio di ' || kind || ' attivato' else 'Servizio di ' || kind || ': ' || new_status end,
    coalesce(nullif(trim(note), ''), 'Verifica completata dallo staff'),
    case kind when 'soccorso' then '/dashboard/soccorso/operatore' when 'trasporto' then '/dashboard/trasporti/operatore' else '/dashboard/revisioni/centro' end,
    'svc-op:' || kind || ':' || admin_set_service_operator.profile_id || ':' || new_status);
  perform private.log_admin_action('service_operator.' || new_status,
    case kind when 'soccorso' then 'roadside_operators' when 'trasporto' then 'transport_operators' else 'inspection_centers' end,
    admin_set_service_operator.profile_id::text, jsonb_build_object('note', note));
end;
$$;

-- RLS revisioni -----------------------------------------------------------
alter table public.inspection_centers enable row level security;
alter table public.inspection_authorizations enable row level security;
alter table public.inspection_appointments enable row level security;
alter table public.inspection_records enable row level security;
revoke all on public.inspection_centers, public.inspection_authorizations, public.inspection_appointments, public.inspection_records from anon, authenticated;
grant all on public.inspection_centers, public.inspection_authorizations, public.inspection_appointments, public.inspection_records to service_role;

grant select on public.inspection_centers to anon, authenticated;
grant insert (profile_id, vehicle_categories, services, hours_text, price_notes), update (vehicle_categories, services, hours_text, price_notes) on public.inspection_centers to authenticated;
create policy "inspection_centers: pubblici se attivi" on public.inspection_centers for select to anon, authenticated using (status = 'attivo' and private.profile_is_public(profile_id));
create policy "inspection_centers: proprietario" on public.inspection_centers for select to authenticated using (private.owns_profile(profile_id));
create policy "inspection_centers: staff" on public.inspection_centers for select to authenticated using (private.has_permission('services.manage'));
create policy "inspection_centers: crea" on public.inspection_centers for insert to authenticated with check (private.owns_profile(profile_id));
create policy "inspection_centers: modifica" on public.inspection_centers for update to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

grant select on public.inspection_authorizations to authenticated;
grant insert (profile_id, authority, authorization_number, categories, issued_on, valid_until, document_path) on public.inspection_authorizations to authenticated;
create policy "inspection_auth: proprietario e staff" on public.inspection_authorizations for select to authenticated
  using (private.owns_profile(profile_id) or private.has_permission('services.manage'));
create policy "inspection_auth: carica" on public.inspection_authorizations for insert to authenticated with check (private.owns_profile(profile_id));

grant select on public.inspection_appointments to authenticated;
create policy "inspection_appts: parti e staff" on public.inspection_appointments for select to authenticated
  using (user_id = (select auth.uid()) or center_owner_id = (select auth.uid()) or private.has_permission('services.manage'));

grant select, delete on public.inspection_records to authenticated;
grant insert (user_vehicle_id, inspected_on, outcome, mileage_km, center_profile_id, center_name, document_path, notes) on public.inspection_records to authenticated;
create policy "inspection_records: titolare" on public.inspection_records for select to authenticated using (owner_id = (select auth.uid()));
create policy "inspection_records: inserisce" on public.inspection_records for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "inspection_records: elimina dichiarate" on public.inspection_records for delete to authenticated using (owner_id = (select auth.uid()) and verification <> 'confermato_centro');

revoke all on function public.request_inspection(uuid, text, timestamptz, date, text, uuid, text, text, text) from public, anon;
grant execute on function public.request_inspection(uuid, text, timestamptz, date, text, uuid, text, text, text) to authenticated;
revoke all on function public.respond_inspection(uuid, text, timestamptz, text, text, integer) from public, anon;
grant execute on function public.respond_inspection(uuid, text, timestamptz, text, text, integer) to authenticated;
revoke all on function public.admin_review_inspection_authorization(uuid, text, text) from public, anon;
grant execute on function public.admin_review_inspection_authorization(uuid, text, text) to authenticated;
grant execute on function private.inspection_center_authorized(uuid) to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-inspection-reminders', '*/30 * * * *', 'select private.process_inspection_reminders()');
  end if;
end $$;

-- =====================================================================
-- FASE 26 — VALUTAZIONE, OFFERTE E PERMUTA
-- =====================================================================
create table public.vehicle_valuations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  user_vehicle_id    uuid references public.user_vehicles (id) on delete set null,
  make               text not null check (char_length(make) between 1 and 60),
  model              text not null check (char_length(model) between 1 and 80),
  version            text check (char_length(version) <= 120),
  year               integer not null check (year between 1950 and 2100),
  mileage_km         integer not null check (mileage_km between 0 and 2000000),
  fuel               public.fuel_type,
  transmission       public.transmission_type,
  power_kw           integer check (power_kw between 1 and 1500),
  engine_cc          integer check (engine_cc between 50 and 10000),
  condition          text not null check (condition in ('ottime', 'buone', 'discrete', 'da_sistemare')),
  owners_count       integer check (owners_count between 1 and 20),
  accidents          text not null default 'non_so' check (accidents in ('nessuno', 'riparati', 'danni_presenti', 'non_so')),
  damage_notes       text check (char_length(damage_notes) <= 1000),
  inspection_status  text not null default 'non_so' check (inspection_status in ('in_regola', 'scaduta', 'non_so')),
  options            text[] not null default '{}' check (cardinality(options) <= 30),
  region             text not null check (char_length(region) between 3 and 40),
  province           text not null check (province ~ '^[A-Z]{2}$'),
  photo_paths        text[] not null default '{}' check (cardinality(photo_paths) <= 12),
  status             text not null default 'bozza' check (status in ('bozza', 'stimata', 'dati_insufficienti')),
  estimate_min_cents integer,
  estimate_mid_cents integer,
  estimate_max_cents integer,
  comparables_count  integer,
  reliability        text check (reliability in ('bassa', 'media', 'alta')),
  method             text,
  missing_info       text[] not null default '{}',
  settings_snapshot  jsonb,
  estimated_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index vehicle_valuations_user_idx on public.vehicle_valuations (user_id, created_at desc);
create trigger vehicle_valuations_updated before update on public.vehicle_valuations for each row execute function private.set_updated_at();

-- I risultati della stima li scrive solo il server.
create or replace function private.valuations_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then new.user_id := auth.uid(); end if;
  if new.user_vehicle_id is not null and not exists (select 1 from public.user_vehicles v where v.id = new.user_vehicle_id and v.owner_id = new.user_id) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where split_part(p, '/', 1) <> new.user_id::text or p !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png|webp)$') then
    raise exception 'Foto non valida' using errcode = '42501';
  end if;
  new.status := 'bozza'; new.estimate_min_cents := null; new.estimate_mid_cents := null; new.estimate_max_cents := null; new.comparables_count := null;
  new.reliability := null; new.method := null; new.missing_info := '{}'; new.settings_snapshot := null; new.estimated_at := null;
  if tg_op = 'INSERT' then perform private.enforce_rate_limit('valuation', 20, interval '1 day'); end if;
  return new;
end;
$$;
create trigger vehicle_valuations_guard before insert or update on public.vehicle_valuations for each row execute function private.valuations_guard();

-- Stima interna preliminare: annunci reali pubblicati o venduti su AutoGarage24 (prezzi richiesti, non transazioni).
create or replace function public.estimate_valuation(valuation_id uuid)
returns public.vehicle_valuations language plpgsql security definer set search_path = ''
as $$
declare _v public.vehicle_valuations%rowtype; _min integer := coalesce((private.setting('valuation_min_comparables'))::text::integer, 3);
        _km numeric := coalesce((private.setting('valuation_km_adjust_per_10k'))::text::numeric, 0.015);
        _yr numeric := coalesce((private.setting('valuation_year_adjust'))::text::numeric, 0.06);
        _cond jsonb := coalesce(private.setting('valuation_condition_factors'), '{}'::jsonb);
        _dmg numeric := coalesce((private.setting('valuation_damage_factor'))::text::numeric, 0.85);
        _spread numeric := coalesce((private.setting('valuation_spread'))::text::numeric, 0.08);
        _n integer; _mid numeric; _sd numeric; _missing text[] := '{}'; _factor numeric; _rel text; _w numeric;
begin
  select * into _v from public.vehicle_valuations where id = valuation_id and user_id = auth.uid() for update;
  if not found then raise exception 'Valutazione non trovata' using errcode = 'P0002'; end if;
  if _v.fuel is null then _missing := array_append(_missing, 'alimentazione'); end if;
  if _v.transmission is null then _missing := array_append(_missing, 'cambio'); end if;
  if _v.power_kw is null then _missing := array_append(_missing, 'potenza'); end if;
  if _v.accidents = 'non_so' then _missing := array_append(_missing, 'storia di incidenti o danni'); end if;
  with comps as (
    select l.price_cents::numeric * (1 + _yr * (_v.year - vh.year)) * (1 + _km * ((coalesce(vh.mileage_km, 0) - _v.mileage_km) / 10000.0)) as adj
    from public.vehicle_listings l join public.vehicles vh on vh.id = l.vehicle_id
    where l.status in ('pubblicato', 'venduto') and l.price_cents > 0
      and lower(vh.make_name) = lower(_v.make) and lower(vh.model) = lower(_v.model)
      and abs(vh.year - _v.year) <= 2
      and (_v.fuel is null or vh.fuel = _v.fuel)
      and (_v.transmission is null or vh.transmission = _v.transmission)
      and (vh.mileage_km is null or abs(vh.mileage_km - _v.mileage_km) <= 80000)
  )
  select count(*), percentile_cont(0.5) within group (order by adj), stddev_samp(adj) into _n, _mid, _sd from comps where adj > 0;
  perform set_config('ag24.trusted', 'on', true);
  if _n < _min or _mid is null then
    update public.vehicle_valuations set status = 'dati_insufficienti', comparables_count = _n, estimate_min_cents = null, estimate_mid_cents = null, estimate_max_cents = null,
      reliability = null, missing_info = array_append(_missing, 'meno di ' || _min || ' annunci comparabili sulla piattaforma per questo modello'),
      method = 'Stima interna AutoGarage24: confronto con annunci comparabili (stessa marca e modello, ±2 anni). Dati insufficienti per una stima affidabile.',
      settings_snapshot = jsonb_build_object('min_comparables', _min), estimated_at = now()
     where id = _v.id returning * into _v;
  else
    _factor := coalesce((_cond ->> _v.condition)::numeric, 1) * case when _v.accidents = 'danni_presenti' then _dmg else 1 end;
    _mid := _mid * _factor;
    _w := greatest(_spread, least(coalesce(_sd / nullif(_mid, 0), 0), 0.25));
    _rel := case when _n >= 10 and _w <= 0.12 and cardinality(_missing) = 0 then 'alta' when _n >= _min + 2 and _w <= 0.2 then 'media' else 'bassa' end;
    update public.vehicle_valuations set status = 'stimata', comparables_count = _n, reliability = _rel, missing_info = _missing,
      estimate_mid_cents = (round(_mid / 10000) * 10000)::integer,
      estimate_min_cents = (round(_mid * (1 - _w) / 10000) * 10000)::integer,
      estimate_max_cents = (round(_mid * (1 + _w) / 10000) * 10000)::integer,
      method = 'Stima interna preliminare AutoGarage24: mediana di ' || _n || ' prezzi richiesti in annunci comparabili della piattaforma (stessa marca e modello, ±2 anni'
        || case when _v.fuel is not null then ', stessa alimentazione' else '' end || '), corretti per età (' || (_yr * 100) || '%/anno) e chilometri (' || (_km * 100)
        || '%/10.000 km), condizioni dichiarate' || case when _v.accidents = 'danni_presenti' then ' e danni presenti' else '' end
        || '. I prezzi degli annunci non sono prezzi di vendita effettivi.',
      settings_snapshot = jsonb_build_object('min_comparables', _min, 'km_adjust', _km, 'year_adjust', _yr, 'condition_factors', _cond, 'damage_factor', _dmg, 'spread', _w),
      estimated_at = now()
     where id = _v.id returning * into _v;
    perform private.notify(_v.user_id, 'automobili', 'Stima della tua auto pronta', _v.make || ' ' || _v.model, '/dashboard/valutazioni/' || _v.id, 'val:' || _v.id || ':' || now()::date);
  end if;
  perform set_config('ag24.trusted', 'off', true);
  return _v;
end;
$$;
revoke all on function public.estimate_valuation(uuid) from public, anon;
grant execute on function public.estimate_valuation(uuid) to authenticated;

-- Richiesta di valutazione professionale: consenso e scelta delle foto da condividere.
create table public.valuation_requests (
  id               uuid primary key default gen_random_uuid(),
  valuation_id     uuid not null references public.vehicle_valuations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  shared_photos    text[] not null default '{}',
  share_estimate   boolean not null default false,
  message          text check (char_length(message) <= 1000),
  intent           text not null default 'vendita' check (intent in ('valutazione', 'vendita')),
  consent_at       timestamptz not null default now(),
  status           text not null default 'aperta' check (status in ('aperta', 'chiusa', 'ritirata')),
  created_at       timestamptz not null default now()
);
create table public.valuation_request_targets (
  request_id      uuid not null references public.valuation_requests (id) on delete cascade,
  profile_id      uuid not null references public.professional_profiles (id) on delete cascade,
  status          text not null default 'inviata' check (status in ('inviata', 'info_richiesta', 'proposta_inviata', 'rifiutata', 'scartata', 'accettata')),
  decline_reason  text check (char_length(decline_reason) <= 500),
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at      timestamptz not null default now(),
  primary key (request_id, profile_id)
);
create index valuation_targets_profile_idx on public.valuation_request_targets (profile_id, created_at desc);

create table public.valuation_offers (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.valuation_requests (id) on delete cascade,
  profile_id      uuid not null references public.professional_profiles (id) on delete cascade,
  kind            text not null check (kind in ('valutazione', 'offerta_acquisto')),
  from_side       text not null check (from_side in ('professionista', 'utente')),
  amount_cents    integer not null check (amount_cents between 10000 and 1000000000),
  conditions      text check (char_length(conditions) <= 1000),
  requires_inspection boolean not null default true,
  valid_until     date not null,
  parent_id       uuid references public.valuation_offers (id) on delete set null,
  status          text not null default 'inviata' check (status in ('inviata', 'accettata', 'rifiutata', 'controproposta', 'ritirata', 'scaduta')),
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);
create index valuation_offers_request_idx on public.valuation_offers (request_id, created_at);

create table public.negotiation_events (
  id          bigint generated always as identity primary key,
  context     text not null check (context in ('valutazione', 'permuta')),
  context_id  uuid not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  event       text not null,
  amount_cents integer,
  note        text check (char_length(note) <= 1000),
  created_at  timestamptz not null default now()
);
create index negotiation_events_ctx_idx on public.negotiation_events (context, context_id, created_at);
create trigger negotiation_events_immutable before update or delete on public.negotiation_events for each row execute function private.audit_logs_immutable();

create or replace function private.negotiation_event(_ctx text, _id uuid, _event text, _amount integer, _note text)
returns void language sql security definer set search_path = ''
as $$ insert into public.negotiation_events (context, context_id, actor_id, event, amount_cents, note) values (_ctx, _id, auth.uid(), _event, _amount, nullif(trim(_note), '')); $$;

create or replace function private.valuation_is_target(_req uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.valuation_request_targets t where t.request_id = _req and private.owns_profile(t.profile_id)); $$;

-- Professionisti compatibili: concessionari e officine pubblicati e approvati, entro il raggio dalla provincia indicata.
create or replace function public.valuation_professionals(p_city text default null, p_limit integer default 30)
returns table (profile_id uuid, slug text, display_name text, city text, professional_type text, verified boolean, rating_avg numeric, review_count integer)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.slug, pp.display_name, pp.city, pp.professional_type::text, pp.business_verified_at is not null,
         (select round(avg(rv.rating)::numeric, 1) from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata'),
         (select count(*)::integer from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata')
  from public.professional_profiles pp
  where pp.professional_type::text in ('venditore_auto', 'officina') and private.profile_is_public(pp.id) and pp.user_id <> auth.uid()
    and (p_city is null or lower(pp.city) = lower(trim(p_city)))
  order by (pp.professional_type::text = 'venditore_auto') desc, (pp.business_verified_at is not null) desc, pp.display_name
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;
grant execute on function public.valuation_professionals(text, integer) to authenticated;

create or replace function public.request_professional_valuation(valuation_id uuid, profile_ids uuid[], shared_photos text[] default '{}',
  share_estimate boolean default false, intent text default 'vendita', message text default null, consent boolean default false)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _v public.vehicle_valuations%rowtype; _id uuid; _p uuid; _user uuid; _conv uuid;
begin
  select * into _v from public.vehicle_valuations v where v.id = request_professional_valuation.valuation_id and v.user_id = auth.uid();
  if not found then raise exception 'Valutazione non trovata' using errcode = 'P0002'; end if;
  if not coalesce(consent, false) then raise exception 'Serve il consenso a condividere i dati dell''auto con i professionisti scelti' using errcode = '22023'; end if;
  if coalesce(cardinality(profile_ids), 0) = 0 or cardinality(profile_ids) > 5 then raise exception 'Scegli da 1 a 5 professionisti' using errcode = '22023'; end if;
  if not (coalesce(shared_photos, '{}') <@ _v.photo_paths) then raise exception 'Puoi condividere solo le foto caricate per questa auto' using errcode = '22023'; end if;
  perform private.enforce_rate_limit('valuation_request', 5, interval '1 day');
  insert into public.valuation_requests (valuation_id, user_id, shared_photos, share_estimate, message, intent)
  values (_v.id, auth.uid(), coalesce(shared_photos, '{}'), coalesce(share_estimate, false) and _v.status = 'stimata', nullif(trim(message), ''), coalesce(intent, 'vendita'))
  returning id into _id;
  foreach _p in array profile_ids loop
    if not exists (select 1 from public.valuation_professionals(null, 100) vp where vp.profile_id = _p) then
      raise exception 'Uno dei professionisti scelti non è disponibile' using errcode = '22023';
    end if;
    select user_id into _user from public.professional_profiles where id = _p;
    _conv := private.open_service_conversation(auth.uid(), _user, _p, 'Valutazione ' || _v.make || ' ' || _v.model || ' ' || _v.year,
      'Richiesta di ' || case when intent = 'valutazione' then 'valutazione professionale' else 'valutazione e offerta di acquisto' end || ': ' || _v.make || ' ' || _v.model
      || coalesce(' ' || _v.version, '') || ', ' || _v.year || ', ' || _v.mileage_km || ' km, provincia ' || _v.province || coalesce(E'\n\n' || nullif(trim(message), ''), ''));
    insert into public.valuation_request_targets (request_id, profile_id, conversation_id) values (_id, _p, _conv);
    perform private.notify(_user, 'richieste', 'Nuova richiesta di valutazione auto', _v.make || ' ' || _v.model || ' ' || _v.year || ' · ' || _v.province,
      '/dashboard/valutazioni/professionista/' || _id, 'valreq:' || _id || ':' || _p);
  end loop;
  perform private.negotiation_event('valutazione', _id, 'richiesta_inviata', null, cardinality(profile_ids) || ' professionisti');
  return _id;
end;
$$;

-- Azioni del professionista: chiedere informazioni, rifiutare motivando, inviare una proposta.
create or replace function public.professional_valuation_action(request_id uuid, action text, amount_cents integer default null, kind text default 'offerta_acquisto',
  conditions text default null, requires_inspection boolean default true, valid_days integer default 7, note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _t public.valuation_request_targets%rowtype; _r public.valuation_requests%rowtype; _o uuid;
begin
  select t.* into _t from public.valuation_request_targets t where t.request_id = professional_valuation_action.request_id and private.owns_profile(t.profile_id) for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  select * into _r from public.valuation_requests where id = _t.request_id;
  if _r.status <> 'aperta' or _t.status in ('rifiutata', 'scartata', 'accettata') then raise exception 'La richiesta non è più aperta' using errcode = '22023'; end if;
  if action = 'info' then
    if coalesce(trim(note), '') = '' then raise exception 'Scrivi le informazioni che ti servono' using errcode = '22023'; end if;
    update public.valuation_request_targets set status = 'info_richiesta' where valuation_request_targets.request_id = _t.request_id and profile_id = _t.profile_id;
    insert into public.messages (conversation_id, sender_id, kind, body) values (_t.conversation_id, auth.uid(), 'testo', 'Richiesta di informazioni: ' || trim(note));
  elsif action = 'rifiuta' then
    if coalesce(trim(note), '') = '' then raise exception 'Indica il motivo del rifiuto' using errcode = '22023'; end if;
    update public.valuation_request_targets set status = 'rifiutata', decline_reason = trim(note) where valuation_request_targets.request_id = _t.request_id and profile_id = _t.profile_id;
    update public.valuation_offers set status = 'ritirata' where valuation_offers.request_id = _t.request_id and profile_id = _t.profile_id and status = 'inviata';
    perform private.notify(_r.user_id, 'richieste', 'Un professionista ha rifiutato la valutazione', trim(note), '/dashboard/valutazioni/richiesta/' || _r.id, 'valdec:' || _r.id || ':' || _t.profile_id);
  elsif action = 'proposta' then
    if amount_cents is null or kind not in ('valutazione', 'offerta_acquisto') then raise exception 'Indica importo e tipo di proposta' using errcode = '22023'; end if;
    update public.valuation_offers set status = 'ritirata' where valuation_offers.request_id = _t.request_id and profile_id = _t.profile_id and status = 'inviata';
    insert into public.valuation_offers (request_id, profile_id, kind, from_side, amount_cents, conditions, requires_inspection, valid_until)
    values (_t.request_id, _t.profile_id, kind, 'professionista', amount_cents, nullif(trim(conditions), ''), coalesce(requires_inspection, true),
            current_date + least(greatest(coalesce(valid_days, 7), 1), 30))
    returning id into _o;
    update public.valuation_request_targets set status = 'proposta_inviata' where valuation_request_targets.request_id = _t.request_id and profile_id = _t.profile_id;
    insert into public.messages (conversation_id, sender_id, kind, body) values (_t.conversation_id, auth.uid(), 'sistema',
      case kind when 'valutazione' then 'Valutazione professionale: € ' else 'Offerta di acquisto: € ' end || to_char(amount_cents / 100.0, 'FM999G999G990'));
    perform private.notify(_r.user_id, 'preventivi', case kind when 'valutazione' then 'Valutazione professionale ricevuta' else 'Offerta di acquisto per la tua auto' end,
      '€ ' || to_char(amount_cents / 100.0, 'FM999G999G990'), '/dashboard/valutazioni/richiesta/' || _r.id, 'valoff:' || _o);
  else
    raise exception 'Azione non valida' using errcode = '22023';
  end if;
  perform private.negotiation_event('valutazione', _r.id, action, amount_cents, note);
  return _o;
end;
$$;

-- Risposta a una proposta: accetta, rifiuta o controproponi (da entrambe le parti, alternandosi).
create or replace function public.respond_valuation_offer(offer_id uuid, action text, counter_cents integer default null, note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _o public.valuation_offers%rowtype; _r public.valuation_requests%rowtype; _side text; _new uuid; _pro_user uuid; _to uuid;
begin
  select * into _o from public.valuation_offers where id = offer_id for update;
  if not found then raise exception 'Proposta non trovata' using errcode = 'P0002'; end if;
  select * into _r from public.valuation_requests where id = _o.request_id;
  select user_id into _pro_user from public.professional_profiles where id = _o.profile_id;
  if _r.user_id = auth.uid() then _side := 'utente'; elsif _pro_user = auth.uid() then _side := 'professionista';
  else raise exception 'Proposta non trovata' using errcode = 'P0002'; end if;
  if _o.from_side = _side then raise exception 'Attendi la risposta dell''altra parte' using errcode = '22023'; end if;
  if _o.status <> 'inviata' or _o.valid_until < current_date then raise exception 'La proposta non è più valida' using errcode = '22023'; end if;
  if _r.status <> 'aperta' then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  _to := case when _side = 'utente' then _pro_user else _r.user_id end;
  if action = 'accetta' then
    update public.valuation_offers set status = 'accettata' where id = _o.id;
    update public.valuation_request_targets set status = 'accettata' where request_id = _r.id and profile_id = _o.profile_id;
    if _o.kind = 'offerta_acquisto' then
      update public.valuation_request_targets set status = 'scartata' where request_id = _r.id and profile_id <> _o.profile_id and status not in ('rifiutata');
      update public.valuation_offers set status = 'rifiutata' where request_id = _r.id and id <> _o.id and status = 'inviata';
      update public.valuation_requests set status = 'chiusa' where id = _r.id;
    end if;
    perform private.notify(_to, 'preventivi', 'Proposta accettata', '€ ' || to_char(_o.amount_cents / 100.0, 'FM999G999G990') || ' — accordo preliminare, da perfezionare con ispezione e documenti',
      case when _side = 'utente' then '/dashboard/valutazioni/professionista/' else '/dashboard/valutazioni/richiesta/' end || _r.id, 'valacc:' || _o.id);
  elsif action = 'rifiuta' then
    update public.valuation_offers set status = 'rifiutata' where id = _o.id;
    perform private.notify(_to, 'preventivi', 'Proposta rifiutata', coalesce(nullif(trim(note), ''), '€ ' || to_char(_o.amount_cents / 100.0, 'FM999G999G990')),
      case when _side = 'utente' then '/dashboard/valutazioni/professionista/' else '/dashboard/valutazioni/richiesta/' end || _r.id, 'valrej:' || _o.id);
  elsif action = 'controproposta' then
    if counter_cents is null or counter_cents < 10000 then raise exception 'Indica l''importo della controproposta' using errcode = '22023'; end if;
    update public.valuation_offers set status = 'controproposta' where id = _o.id;
    insert into public.valuation_offers (request_id, profile_id, kind, from_side, amount_cents, conditions, requires_inspection, valid_until, parent_id)
    values (_r.id, _o.profile_id, _o.kind, _side, counter_cents, nullif(trim(note), ''), _o.requires_inspection, current_date + 7, _o.id)
    returning id into _new;
    perform private.notify(_to, 'preventivi', 'Controproposta ricevuta', '€ ' || to_char(counter_cents / 100.0, 'FM999G999G990'),
      case when _side = 'utente' then '/dashboard/valutazioni/professionista/' else '/dashboard/valutazioni/richiesta/' end || _r.id, 'valcnt:' || _new);
  else
    raise exception 'Azione non valida' using errcode = '22023';
  end if;
  perform private.negotiation_event('valutazione', _r.id, action || '_' || _side, coalesce(counter_cents, _o.amount_cents), note);
  return _new;
end;
$$;

create or replace function public.withdraw_valuation_request(request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.valuation_requests%rowtype; _t record;
begin
  update public.valuation_requests v set status = 'ritirata' where v.id = withdraw_valuation_request.request_id and v.user_id = auth.uid() and v.status = 'aperta' returning * into _r;
  if _r.id is null then raise exception 'Richiesta non trovata o già chiusa' using errcode = 'P0002'; end if;
  update public.valuation_offers set status = 'ritirata' where valuation_offers.request_id = _r.id and status = 'inviata';
  for _t in select pp.user_id from public.valuation_request_targets t join public.professional_profiles pp on pp.id = t.profile_id where t.request_id = _r.id loop
    perform private.notify(_t.user_id, 'richieste', 'Richiesta di valutazione ritirata', 'Il cliente ha ritirato la richiesta', '/dashboard/valutazioni/professionista/' || _r.id, 'valwd:' || _r.id || ':' || _t.user_id);
  end loop;
  perform private.negotiation_event('valutazione', _r.id, 'ritirata', null, null);
end;
$$;

-- Permuta: proposta su un annuncio pubblicato, con calcolo della differenza indicativa lato server.
create table public.trade_in_proposals (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null references public.vehicle_listings (id) on delete cascade,
  buyer_id             uuid not null references public.profiles (id) on delete cascade,
  seller_id            uuid not null references public.profiles (id) on delete cascade,
  valuation_id         uuid not null references public.vehicle_valuations (id) on delete restrict,
  listing_price_cents  integer not null,
  proposed_value_cents integer not null check (proposed_value_cents between 10000 and 1000000000),
  difference_cents     integer generated always as (listing_price_cents - proposed_value_cents) stored,
  counter_value_cents  integer check (counter_value_cents between 10000 and 1000000000),
  message              text check (char_length(message) <= 1000),
  status               text not null default 'inviata' check (status in ('inviata', 'in_valutazione', 'ispezione_richiesta', 'controproposta', 'accettata', 'rifiutata', 'ritirata')),
  conversation_id      uuid references public.conversations (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index trade_in_buyer_idx on public.trade_in_proposals (buyer_id, created_at desc);
create index trade_in_seller_idx on public.trade_in_proposals (seller_id, status);
create trigger trade_in_updated before update on public.trade_in_proposals for each row execute function private.set_updated_at();

create or replace function public.propose_trade_in(listing_id uuid, valuation_id uuid, proposed_value_cents integer, message text default null, share_photos boolean default false)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _l public.vehicle_listings%rowtype; _v public.vehicle_valuations%rowtype; _id uuid; _conv uuid;
begin
  select * into _l from public.vehicle_listings l where l.id = propose_trade_in.listing_id and l.status = 'pubblicato';
  if not found then raise exception 'Annuncio non disponibile' using errcode = 'P0002'; end if;
  if _l.owner_id = auth.uid() then raise exception 'Non puoi proporre una permuta sul tuo annuncio' using errcode = '22023'; end if;
  if _l.price_cents is null then raise exception 'L''annuncio non indica un prezzo: chiedi informazioni al venditore' using errcode = '22023'; end if;
  select * into _v from public.vehicle_valuations v where v.id = propose_trade_in.valuation_id and v.user_id = auth.uid();
  if not found then raise exception 'Valutazione non trovata' using errcode = 'P0002'; end if;
  if exists (select 1 from public.trade_in_proposals t where t.listing_id = _l.id and t.buyer_id = auth.uid() and t.status in ('inviata', 'in_valutazione', 'ispezione_richiesta', 'controproposta')) then
    raise exception 'Hai già una proposta di permuta aperta per questa auto' using errcode = '23505';
  end if;
  perform private.enforce_rate_limit('trade_in', 5, interval '1 day');
  _conv := private.open_service_conversation(auth.uid(), _l.owner_id, _l.professional_profile_id, 'Permuta — ' || _l.title,
    'Proposta di permuta per «' || _l.title || '»' || E'\nAuto in permuta: ' || _v.make || ' ' || _v.model || ' ' || _v.year || ', ' || _v.mileage_km || ' km, condizioni ' || _v.condition
    || E'\nValore proposto: € ' || to_char(proposed_value_cents / 100.0, 'FM999G999G990') || E'\nDifferenza indicativa: € ' || to_char((_l.price_cents - proposed_value_cents) / 100.0, 'FM999G999G990')
    || E'\nCalcolo preliminare, non è un accordo concluso.' || coalesce(E'\n\n' || nullif(trim(message), ''), ''));
  insert into public.trade_in_proposals (listing_id, buyer_id, seller_id, valuation_id, listing_price_cents, proposed_value_cents, message, conversation_id)
  values (_l.id, auth.uid(), _l.owner_id, _v.id, _l.price_cents, proposed_value_cents, nullif(trim(message), ''), _conv)
  returning id into _id;
  perform private.negotiation_event('permuta', _id, 'inviata', proposed_value_cents, null);
  perform private.notify(_l.owner_id, 'richieste', 'Proposta di permuta', _l.title || ' · ' || _v.make || ' ' || _v.model || ' ' || _v.year, '/dashboard/permute/' || _id, 'trade:' || _id);
  return _id;
end;
$$;

create or replace function public.respond_trade_in(proposal_id uuid, action text, counter_cents integer default null, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _t public.trade_in_proposals%rowtype; _seller boolean; _buyer boolean; _new text; _to uuid;
begin
  select * into _t from public.trade_in_proposals where id = proposal_id for update;
  if not found then raise exception 'Proposta non trovata' using errcode = 'P0002'; end if;
  _seller := _t.seller_id = auth.uid(); _buyer := _t.buyer_id = auth.uid();
  if not _seller and not _buyer then raise exception 'Proposta non trovata' using errcode = 'P0002'; end if;
  if _t.status in ('accettata', 'rifiutata', 'ritirata') then raise exception 'La trattativa è chiusa' using errcode = '22023'; end if;
  if _seller and action = 'valuta' and _t.status = 'inviata' then _new := 'in_valutazione';
  elsif _seller and action = 'ispezione' then _new := 'ispezione_richiesta';
  elsif _seller and action = 'controproposta' then
    if counter_cents is null or counter_cents < 10000 then raise exception 'Indica il valore della controproposta' using errcode = '22023'; end if;
    _new := 'controproposta';
  elsif _seller and action = 'accetta' and _t.status <> 'controproposta' then _new := 'accettata';
  elsif _seller and action = 'rifiuta' then _new := 'rifiutata';
  elsif _buyer and action = 'accetta' and _t.status = 'controproposta' then _new := 'accettata';
  elsif _buyer and action = 'rifiuta' and _t.status = 'controproposta' then _new := 'rifiutata';
  elsif _buyer and action = 'ritira' then _new := 'ritirata';
  else raise exception 'Operazione non consentita in questo stato' using errcode = '22023';
  end if;
  update public.trade_in_proposals set status = _new, counter_value_cents = case when action = 'controproposta' then counter_cents else counter_value_cents end where id = _t.id;
  perform private.negotiation_event('permuta', _t.id, action, coalesce(counter_cents, case when action = 'accetta' then coalesce(_t.counter_value_cents, _t.proposed_value_cents) end), note);
  if _t.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body) values (_t.conversation_id, auth.uid(), 'sistema',
      'Permuta: ' || replace(_new, '_', ' ') || coalesce(' · € ' || to_char(counter_cents / 100.0, 'FM999G999G990'), '') || coalesce(' — ' || nullif(trim(note), ''), ''));
  end if;
  _to := case when _seller then _t.buyer_id else _t.seller_id end;
  perform private.notify(_to, 'richieste', 'Permuta: ' || replace(_new, '_', ' '), coalesce(nullif(trim(note), ''), 'Aggiornamento sulla trattativa'), '/dashboard/permute/' || _t.id, 'trade:' || _t.id || ':' || _new || ':' || now()::text);
end;
$$;

create or replace function public.admin_valuation_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('valuations.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'valutazioni', (select count(*) from public.vehicle_valuations),
    'stimate', (select count(*) from public.vehicle_valuations where status = 'stimata'),
    'dati_insufficienti', (select count(*) from public.vehicle_valuations where status = 'dati_insufficienti'),
    'richieste_professionali', (select count(*) from public.valuation_requests),
    'proposte', (select count(*) from public.valuation_offers where from_side = 'professionista'),
    'proposte_accettate', (select count(*) from public.valuation_offers where status = 'accettata'),
    'permute', (select count(*) from public.trade_in_proposals),
    'permute_accettate', (select count(*) from public.trade_in_proposals where status = 'accettata'));
end;
$$;

-- RLS valutazioni e permute --------------------------------------------------
alter table public.vehicle_valuations enable row level security;
alter table public.valuation_requests enable row level security;
alter table public.valuation_request_targets enable row level security;
alter table public.valuation_offers enable row level security;
alter table public.negotiation_events enable row level security;
alter table public.trade_in_proposals enable row level security;
revoke all on public.vehicle_valuations, public.valuation_requests, public.valuation_request_targets, public.valuation_offers, public.negotiation_events,
  public.trade_in_proposals from anon, authenticated;
grant all on public.vehicle_valuations, public.valuation_requests, public.valuation_request_targets, public.valuation_offers, public.negotiation_events,
  public.trade_in_proposals to service_role;

grant select, delete on public.vehicle_valuations to authenticated;
grant insert (user_vehicle_id, make, model, version, year, mileage_km, fuel, transmission, power_kw, engine_cc, condition, owners_count, accidents, damage_notes,
              inspection_status, options, region, province, photo_paths),
      update (user_vehicle_id, make, model, version, year, mileage_km, fuel, transmission, power_kw, engine_cc, condition, owners_count, accidents, damage_notes,
              inspection_status, options, region, province, photo_paths) on public.vehicle_valuations to authenticated;
create policy "valuations: titolare" on public.vehicle_valuations for select to authenticated using (user_id = (select auth.uid()));
create policy "valuations: crea" on public.vehicle_valuations for insert to authenticated with check (private.is_active_user());
create policy "valuations: modifica" on public.vehicle_valuations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "valuations: elimina se non in trattativa" on public.vehicle_valuations for delete to authenticated
  using (user_id = (select auth.uid()) and not exists (select 1 from public.trade_in_proposals t where t.valuation_id = vehicle_valuations.id and t.status in ('inviata', 'in_valutazione', 'ispezione_richiesta', 'controproposta', 'accettata')));
-- Professionisti destinatari e venditori con permuta vedono i dati dell'auto (mai il titolare oltre al nome nella conversazione).
create policy "valuations: professionisti destinatari" on public.vehicle_valuations for select to authenticated
  using (exists (select 1 from public.valuation_requests r where r.valuation_id = vehicle_valuations.id and private.valuation_is_target(r.id) and r.status <> 'ritirata')
         or exists (select 1 from public.trade_in_proposals t where t.valuation_id = vehicle_valuations.id and t.seller_id = (select auth.uid())));
create policy "valuations: staff" on public.vehicle_valuations for select to authenticated using (private.has_permission('valuations.manage'));

grant select on public.valuation_requests, public.valuation_request_targets, public.valuation_offers, public.negotiation_events, public.trade_in_proposals to authenticated;
create policy "valuation_requests: parti" on public.valuation_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.valuation_is_target(id) or private.has_permission('valuations.manage'));
create policy "valuation_targets: parti" on public.valuation_request_targets for select to authenticated
  using (private.owns_profile(profile_id) or exists (select 1 from public.valuation_requests r where r.id = request_id and r.user_id = (select auth.uid()))
         or private.has_permission('valuations.manage'));
create policy "valuation_offers: parti" on public.valuation_offers for select to authenticated
  using (private.owns_profile(profile_id) or exists (select 1 from public.valuation_requests r where r.id = request_id and r.user_id = (select auth.uid()))
         or private.has_permission('valuations.manage'));
create policy "negotiation_events: parti" on public.negotiation_events for select to authenticated
  using ((context = 'valutazione' and exists (select 1 from public.valuation_requests r where r.id = context_id and (r.user_id = (select auth.uid()) or private.valuation_is_target(r.id))))
      or (context = 'permuta' and exists (select 1 from public.trade_in_proposals t where t.id = context_id and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))))
      or private.has_permission('valuations.manage'));
create policy "trade_in: parti" on public.trade_in_proposals for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or private.has_permission('valuations.manage'));

-- Foto delle valutazioni: bucket privato; i professionisti vedono solo quelle condivise esplicitamente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('valuation-photos', 'valuation-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "valuation-photos: caricamento" on storage.objects for insert to authenticated
  with check (bucket_id = 'valuation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "valuation-photos: eliminazione" on storage.objects for delete to authenticated
  using (bucket_id = 'valuation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "valuation-photos: lettura" on storage.objects for select to authenticated
  using (bucket_id = 'valuation-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.valuation_requests r where name = any (r.shared_photos) and r.status <> 'ritirata' and private.valuation_is_target(r.id))
    or private.has_permission('valuations.manage')));

revoke all on function public.request_professional_valuation(uuid, uuid[], text[], boolean, text, text, boolean) from public, anon;
grant execute on function public.request_professional_valuation(uuid, uuid[], text[], boolean, text, text, boolean) to authenticated;
revoke all on function public.professional_valuation_action(uuid, text, integer, text, text, boolean, integer, text) from public, anon;
grant execute on function public.professional_valuation_action(uuid, text, integer, text, text, boolean, integer, text) to authenticated;
revoke all on function public.respond_valuation_offer(uuid, text, integer, text) from public, anon;
grant execute on function public.respond_valuation_offer(uuid, text, integer, text) to authenticated;
revoke all on function public.withdraw_valuation_request(uuid) from public, anon;
grant execute on function public.withdraw_valuation_request(uuid) to authenticated;
revoke all on function public.propose_trade_in(uuid, uuid, integer, text, boolean) from public, anon;
grant execute on function public.propose_trade_in(uuid, uuid, integer, text, boolean) to authenticated;
revoke all on function public.respond_trade_in(uuid, text, integer, text) from public, anon;
grant execute on function public.respond_trade_in(uuid, text, integer, text) to authenticated;
revoke all on function public.admin_valuation_stats() from public, anon;
grant execute on function public.admin_valuation_stats() to authenticated;
grant execute on function private.valuation_is_target(uuid) to authenticated, service_role;

-- =====================================================================
-- Storici immutabili ma cancellabili a cascata
-- Le cronologie non si modificano né si cancellano direttamente; vengono eliminate
-- solo insieme alla pratica a cui appartengono (es. cancellazione dei dati richiesta
-- dall'utente o dell'account), così il diritto alla cancellazione resta esercitabile.
-- =====================================================================
create or replace function private.history_immutable()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'Cronologia in sola aggiunta: % non consentito', tg_op using errcode = '42501';
end;
$$;

do $$
declare _t record;
begin
  for _t in select * from (values ('review_history_immutable', 'review_history'), ('offer_status_history_immutable', 'offer_status_history'),
      ('vehicle_booking_events_immutable', 'vehicle_booking_events'), ('roadside_events_immutable', 'roadside_events'),
      ('transport_reports_immutable', 'transport_reports'), ('transport_events_immutable', 'transport_events'),
      ('insurance_events_immutable', 'insurance_request_events'), ('negotiation_events_immutable', 'negotiation_events')) v(trg, tbl) loop
    execute format('drop trigger if exists %I on public.%I', _t.trg, _t.tbl);
    execute format('create trigger %I before update or delete on public.%I for each row execute function private.history_immutable()', _t.trg, _t.tbl);
  end loop;
end $$;

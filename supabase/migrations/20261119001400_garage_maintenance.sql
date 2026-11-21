-- =====================================================================
-- AutoGarage24 — Migrazione 0014 (Fase 8): garage virtuale, storico
-- manutenzione, rapporti dei professionisti, documenti, promemoria,
-- chilometraggio, spese e job pianificati.
-- =====================================================================

create type public.maintenance_category as enum (
  'tagliando', 'cambio_olio', 'filtri', 'freni', 'pneumatici', 'batteria', 'distribuzione', 'frizione', 'sospensioni',
  'climatizzazione', 'revisione', 'diagnosi', 'riparazione_motore', 'riparazione_carrozzeria', 'altro');
create type public.record_source as enum ('manuale', 'professionista', 'importato');
create type public.reminder_status as enum ('attivo', 'in_scadenza', 'scaduto', 'completato', 'disattivato');
create type public.expense_category as enum (
  'riparazioni', 'tagliandi', 'ricambi', 'pneumatici', 'assicurazione', 'revisione', 'bollo', 'carburante', 'altro');

-- ---------------------------------------------------------------------
-- Garage virtuale: targa e VIN sono dati privati del titolare.
-- ---------------------------------------------------------------------
create table public.user_vehicles (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references public.profiles (id) on delete cascade,
  make_slug                text check (make_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  make                     text not null check (char_length(make) between 1 and 60),
  model                    text not null check (char_length(model) between 1 and 80),
  version                  text check (char_length(version) <= 120),
  engine_code              text check (char_length(engine_code) <= 40),
  year                     integer check (year between 1950 and 2100),
  registration_date        date,
  fuel                     public.fuel_type,
  engine_cc                integer check (engine_cc between 0 and 10000),
  power_kw                 numeric(6,1) check (power_kw > 0 and power_kw < 2000),
  transmission             public.transmission_type,
  current_mileage_km       integer check (current_mileage_km between 0 and 2000000),
  plate                    text check (plate ~ '^[A-Z0-9 -]{4,12}$'),
  vin                      text check (vin ~ '^[A-HJ-NPR-Z0-9]{11,17}$'),
  photo_path               text check (char_length(photo_path) <= 400),
  purchase_date            date,
  is_primary               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);
comment on column public.user_vehicles.plate is 'Targa: dato privato, mai mostrato pubblicamente.';
create index user_vehicles_owner_idx on public.user_vehicles (owner_id) where deleted_at is null;
create unique index user_vehicles_one_primary_idx on public.user_vehicles (owner_id) where is_primary and deleted_at is null;
create trigger user_vehicles_set_updated_at before update on public.user_vehicles for each row execute function private.set_updated_at();

alter table public.requests add constraint requests_user_vehicle_fk foreign key (user_vehicle_id) references public.user_vehicles (id) on delete set null;

create or replace function private.owns_user_vehicle(_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.user_vehicles where id = _id and owner_id = (select auth.uid()) and deleted_at is null); $$;
grant execute on function private.owns_user_vehicle(uuid) to authenticated, service_role;

create or replace function public.set_primary_vehicle(vehicle_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.owns_user_vehicle(vehicle_id) then raise exception 'Automobile non trovata' using errcode = 'P0002'; end if;
  update public.user_vehicles set is_primary = false where owner_id = auth.uid() and is_primary;
  update public.user_vehicles set is_primary = true where id = vehicle_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Chilometraggio: storico con segnalazione delle incoerenze (mai corrette in automatico)
-- ---------------------------------------------------------------------
create table public.mileage_logs (
  id               uuid primary key default gen_random_uuid(),
  user_vehicle_id  uuid not null references public.user_vehicles (id) on delete cascade,
  value_km         integer not null check (value_km between 0 and 2000000),
  recorded_on      date not null default current_date,
  source           text not null default 'utente' check (source in ('utente', 'intervento', 'professionista')),
  note             text check (char_length(note) <= 300),
  is_inconsistent  boolean not null default false,
  created_at       timestamptz not null default now()
);
create index mileage_logs_vehicle_idx on public.mileage_logs (user_vehicle_id, recorded_on);

create or replace function private.mileage_logs_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.is_inconsistent := exists (
    select 1 from public.mileage_logs m
     where m.user_vehicle_id = new.user_vehicle_id
       and ((m.recorded_on <= new.recorded_on and m.value_km > new.value_km)
         or (m.recorded_on >= new.recorded_on and m.value_km < new.value_km)));
  return new;
end;
$$;
create trigger mileage_logs_before_insert before insert on public.mileage_logs for each row execute function private.mileage_logs_before_insert();

create or replace function private.mileage_logs_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.user_vehicles set current_mileage_km = new.value_km
   where id = new.user_vehicle_id and not new.is_inconsistent
     and (current_mileage_km is null or new.value_km >= current_mileage_km);
  return null;
end;
$$;
create trigger mileage_logs_after_insert after insert on public.mileage_logs for each row execute function private.mileage_logs_after_insert();

-- ---------------------------------------------------------------------
-- Storico manutenzione con provenienza del dato
-- ---------------------------------------------------------------------
create table public.maintenance_records (
  id                       uuid primary key default gen_random_uuid(),
  user_vehicle_id          uuid not null references public.user_vehicles (id) on delete cascade,
  owner_id                 uuid not null references public.profiles (id) on delete cascade,
  title                    text not null check (char_length(title) between 2 and 140),
  category                 public.maintenance_category not null,
  performed_on             date not null,
  mileage_km               integer check (mileage_km between 0 and 2000000),
  description              text check (char_length(description) <= 4000),
  provider_name            text check (char_length(provider_name) <= 160),
  professional_profile_id  uuid references public.professional_profiles (id) on delete set null,
  cost_cents               bigint check (cost_cents >= 0 and cost_cents < 10000000000),
  parts_used               text check (char_length(parts_used) <= 2000),
  part_id                  uuid references public.part_listings (id) on delete set null,
  notes                    text check (char_length(notes) <= 2000),
  source                   public.record_source not null default 'manuale',
  request_id               uuid references public.requests (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on column public.maintenance_records.source is
  'manuale = inserito dall''utente; professionista = proposto da un professionista e confermato dal proprietario.';
create index maintenance_records_vehicle_idx on public.maintenance_records (user_vehicle_id, performed_on desc);
create trigger maintenance_records_set_updated_at before update on public.maintenance_records for each row execute function private.set_updated_at();

-- Un intervento "professionista" nasce solo da un rapporto confermato: l'utente non può falsificarne la provenienza.
create or replace function private.maintenance_records_guard()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  -- Le funzioni di sistema (SECURITY DEFINER) non sono eseguite come utente API.
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.source := 'manuale'; new.request_id := null; new.professional_profile_id := null;
  elsif old.source <> 'manuale' and (new.title, new.category, new.performed_on, new.mileage_km, new.description, new.cost_cents)
        is distinct from (old.title, old.category, old.performed_on, old.mileage_km, old.description, old.cost_cents) then
    raise exception 'Un intervento registrato da un professionista non può essere modificato' using errcode = '42501';
  else
    new.source := old.source; new.request_id := old.request_id; new.professional_profile_id := old.professional_profile_id;
  end if;
  return new;
end;
$$;
create trigger maintenance_records_guard before insert or update on public.maintenance_records
  for each row execute function private.maintenance_records_guard();

-- Rapporti di lavoro proposti dai professionisti: diventano storico solo dopo conferma.
create table public.work_reports (
  id                       uuid primary key default gen_random_uuid(),
  request_id               uuid not null references public.requests (id) on delete cascade,
  professional_profile_id  uuid not null references public.professional_profiles (id) on delete cascade,
  author_id                uuid not null references public.profiles (id) on delete cascade,
  owner_id                 uuid not null references public.profiles (id) on delete cascade,
  user_vehicle_id          uuid references public.user_vehicles (id) on delete set null,
  performed_on             date not null,
  mileage_km               integer check (mileage_km between 0 and 2000000),
  category                 public.maintenance_category not null,
  title                    text not null check (char_length(title) between 2 and 140),
  description              text not null check (char_length(description) between 5 and 4000),
  parts_used               text check (char_length(parts_used) <= 2000),
  cost_cents               bigint check (cost_cents >= 0),
  status                   text not null default 'proposto' check (status in ('proposto', 'approvato', 'contestato')),
  owner_note               text check (char_length(owner_note) <= 1000),
  record_id                uuid references public.maintenance_records (id) on delete set null,
  created_at               timestamptz not null default now(),
  decided_at               timestamptz
);

create or replace function public.propose_work_report(
  request_id uuid, performed_on date, category public.maintenance_category, title text, description text,
  mileage_km integer default null, parts_used text default null, cost_cents bigint default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _id uuid;
begin
  select * into _r from public.requests where id = request_id;
  if not found or _r.recipient_id <> auth.uid() or _r.professional_profile_id is null then
    raise exception 'Richiesta non trovata' using errcode = 'P0002';
  end if;
  if _r.status not in ('accettata', 'completata', 'appuntamento_proposto', 'in_lavorazione') then
    raise exception 'Il rapporto è possibile solo per un intervento concordato' using errcode = '22023';
  end if;
  insert into public.work_reports (request_id, professional_profile_id, author_id, owner_id, user_vehicle_id, performed_on, mileage_km,
                                   category, title, description, parts_used, cost_cents)
  values (request_id, _r.professional_profile_id, auth.uid(), _r.requester_id, _r.user_vehicle_id, performed_on, mileage_km,
          category, title, description, parts_used, cost_cents)
  returning id into _id;
  perform private.notify(_r.requester_id, 'manutenzione', 'Rapporto di intervento da confermare', title,
    '/dashboard/manutenzione/storico', 'work-report:' || _id, 'rapporto_intervento');
  return _id;
end;
$$;

create or replace function public.decide_work_report(report_id uuid, approve boolean, note text default null, target_vehicle_id uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _w public.work_reports%rowtype; _vehicle uuid; _rec uuid;
begin
  select * into _w from public.work_reports where id = report_id for update;
  if not found or _w.owner_id <> auth.uid() then raise exception 'Rapporto non trovato' using errcode = 'P0002'; end if;
  if _w.status <> 'proposto' then raise exception 'Il rapporto è già stato gestito' using errcode = '22023'; end if;
  if approve then
    _vehicle := coalesce(target_vehicle_id, _w.user_vehicle_id);
    if _vehicle is null or not private.owns_user_vehicle(_vehicle) then
      raise exception 'Seleziona l''automobile del tuo garage a cui associare l''intervento' using errcode = '22023';
    end if;
    insert into public.maintenance_records (user_vehicle_id, owner_id, title, category, performed_on, mileage_km, description,
      provider_name, professional_profile_id, cost_cents, parts_used, source, request_id)
    select _vehicle, _w.owner_id, _w.title, _w.category, _w.performed_on, _w.mileage_km, _w.description, pp.display_name,
           _w.professional_profile_id, _w.cost_cents, _w.parts_used, 'professionista', _w.request_id
      from public.professional_profiles pp where pp.id = _w.professional_profile_id
    returning id into _rec;
    if _w.mileage_km is not null then
      insert into public.mileage_logs (user_vehicle_id, value_km, recorded_on, source, note)
      values (_vehicle, _w.mileage_km, _w.performed_on, 'professionista', 'Da rapporto confermato');
    end if;
  end if;
  update public.work_reports set status = case when approve then 'approvato' else 'contestato' end, owner_note = note,
         decided_at = now(), record_id = _rec where id = report_id;
  perform private.notify(_w.author_id, 'manutenzione', case when approve then 'Rapporto confermato dal cliente' else 'Rapporto contestato dal cliente' end,
    coalesce(note, _w.title), '/dashboard/richieste/' || _w.request_id, 'work-report-decision:' || report_id, null);
end;
$$;

-- ---------------------------------------------------------------------
-- Documenti dell'auto (bucket privato "vehicle-documents/<user_id>/...")
-- ---------------------------------------------------------------------
create table public.user_vehicle_documents (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  user_vehicle_id  uuid references public.user_vehicles (id) on delete cascade,
  record_id        uuid references public.maintenance_records (id) on delete set null,
  category         text not null default 'altro' check (category in ('fattura', 'ricevuta', 'preventivo', 'manutenzione', 'tecnico', 'foto', 'altro')),
  title            text not null check (char_length(title) between 2 and 160),
  document_date    date,
  storage_path     text not null unique check (char_length(storage_path) <= 400),
  mime_type        text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes       integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at       timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = owner_id::text)
);
create index user_vehicle_documents_owner_idx on public.user_vehicle_documents (owner_id, created_at desc);

-- ---------------------------------------------------------------------
-- Promemoria e scadenze (intervalli inseriti dall'utente, nessun valore universale)
-- ---------------------------------------------------------------------
create table public.maintenance_reminders (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles (id) on delete cascade,
  user_vehicle_id     uuid not null references public.user_vehicles (id) on delete cascade,
  title               text not null check (char_length(title) between 2 and 140),
  category            text not null check (category in ('revisione', 'assicurazione', 'bollo', 'cambio_olio', 'tagliando', 'pneumatici',
                                                         'batteria', 'manutenzione', 'altro')),
  description         text check (char_length(description) <= 1000),
  due_date            date,
  due_mileage_km      integer check (due_mileage_km between 0 and 2000000),
  recurrence_months   integer check (recurrence_months between 1 and 120),
  recurrence_km       integer check (recurrence_km between 100 and 500000),
  notify_days_before  integer not null default 15 check (notify_days_before between 0 and 120),
  notify_email        boolean not null default true,
  status              public.reminder_status not null default 'attivo',
  last_notified_on    date,
  last_notified_kind  text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (due_date is not null or due_mileage_km is not null)
);
create index maintenance_reminders_due_idx on public.maintenance_reminders (status, due_date);
create trigger maintenance_reminders_set_updated_at before update on public.maintenance_reminders for each row execute function private.set_updated_at();

-- Completamento con eventuale ricorrenza (crea il promemoria successivo).
create or replace function public.complete_reminder(reminder_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.maintenance_reminders%rowtype; _km integer;
begin
  select * into _r from public.maintenance_reminders where id = reminder_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Promemoria non trovato' using errcode = 'P0002'; end if;
  update public.maintenance_reminders set status = 'completato', completed_at = now() where id = reminder_id;
  if _r.recurrence_months is not null or _r.recurrence_km is not null then
    select current_mileage_km into _km from public.user_vehicles where id = _r.user_vehicle_id;
    insert into public.maintenance_reminders (owner_id, user_vehicle_id, title, category, description, due_date, due_mileage_km,
      recurrence_months, recurrence_km, notify_days_before, notify_email)
    values (_r.owner_id, _r.user_vehicle_id, _r.title, _r.category, _r.description,
      case when _r.recurrence_months is not null then (greatest(coalesce(_r.due_date, current_date), current_date)
                                                       + make_interval(months => _r.recurrence_months))::date end,
      case when _r.recurrence_km is not null then coalesce(_km, _r.due_mileage_km, 0) + _r.recurrence_km end,
      _r.recurrence_months, _r.recurrence_km, _r.notify_days_before, _r.notify_email);
  end if;
end;
$$;

-- Elaborazione giornaliera dei promemoria (job pianificato server-side).
-- Idempotente: una notifica per promemoria, tipo e giorno (dedupe_key).
create or replace function private.process_reminders()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _r record; _n integer := 0; _kind text; _title text;
begin
  for _r in
    select m.*, uv.current_mileage_km, uv.make || ' ' || uv.model as car
      from public.maintenance_reminders m join public.user_vehicles uv on uv.id = m.user_vehicle_id and uv.deleted_at is null
     where m.status in ('attivo', 'in_scadenza', 'scaduto')
  loop
    _kind := case
      when _r.due_date is not null and _r.due_date < current_date then 'scaduto'
      when _r.due_mileage_km is not null and _r.current_mileage_km is not null and _r.current_mileage_km >= _r.due_mileage_km then 'km_raggiunti'
      when _r.due_date is not null and _r.due_date <= current_date + _r.notify_days_before then 'in_scadenza'
      else null end;
    if _kind is null then continue; end if;
    update public.maintenance_reminders
       set status = case when _kind in ('scaduto', 'km_raggiunti') then 'scaduto' else 'in_scadenza' end::public.reminder_status
     where id = _r.id;
    if _r.last_notified_kind is distinct from _kind or _r.last_notified_on is null
       or (_kind = 'scaduto' and _r.last_notified_on < current_date - 7) then
      _title := case _kind when 'scaduto' then 'Scadenza superata: ' when 'km_raggiunti' then 'Chilometraggio raggiunto: '
                           else 'Scadenza in arrivo: ' end || _r.title;
      perform private.notify(_r.owner_id, 'manutenzione', _title,
        _r.car || coalesce(' — entro il ' || to_char(_r.due_date, 'DD/MM/YYYY'), '') || coalesce(' — a ' || _r.due_mileage_km || ' km', ''),
        '/dashboard/manutenzione', 'reminder:' || _r.id || ':' || _kind || ':' || current_date,
        case when _r.notify_email then 'promemoria_manutenzione' end);
      update public.maintenance_reminders set last_notified_on = current_date, last_notified_kind = _kind where id = _r.id;
      _n := _n + 1;
    end if;
  end loop;
  return _n;
end;
$$;

-- ---------------------------------------------------------------------
-- Spese registrate dall'utente
-- ---------------------------------------------------------------------
create table public.vehicle_expenses (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  user_vehicle_id  uuid not null references public.user_vehicles (id) on delete cascade,
  record_id        uuid references public.maintenance_records (id) on delete set null,
  category         public.expense_category not null,
  amount_cents     bigint not null check (amount_cents > 0 and amount_cents < 10000000000),
  spent_on         date not null,
  description      text check (char_length(description) <= 300),
  created_at       timestamptz not null default now()
);
create index vehicle_expenses_owner_idx on public.vehicle_expenses (owner_id, spent_on desc);

-- ---------------------------------------------------------------------
-- RLS: tutto privato del titolare (nessun accesso dello staff ai dati del garage)
-- ---------------------------------------------------------------------
alter table public.user_vehicles enable row level security;
alter table public.mileage_logs enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.work_reports enable row level security;
alter table public.user_vehicle_documents enable row level security;
alter table public.maintenance_reminders enable row level security;
alter table public.vehicle_expenses enable row level security;
revoke all on table public.user_vehicles, public.mileage_logs, public.maintenance_records, public.work_reports,
  public.user_vehicle_documents, public.maintenance_reminders, public.vehicle_expenses from anon, authenticated;
grant all on table public.user_vehicles, public.mileage_logs, public.maintenance_records, public.work_reports,
  public.user_vehicle_documents, public.maintenance_reminders, public.vehicle_expenses to service_role;
grant select, insert, update, delete on table public.user_vehicles, public.mileage_logs, public.maintenance_records,
  public.user_vehicle_documents, public.vehicle_expenses to authenticated;
grant select, insert, delete on table public.maintenance_reminders to authenticated;
grant update (title, category, description, due_date, due_mileage_km, recurrence_months, recurrence_km, notify_days_before,
              notify_email, status) on table public.maintenance_reminders to authenticated;
grant select on table public.work_reports to authenticated;

create policy "user_vehicles: titolare" on public.user_vehicles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Il professionista destinatario di una richiesta vede solo i dati tecnici necessari (niente targa/VIN: vedi vista sotto).
create policy "mileage_logs: titolare" on public.mileage_logs for all to authenticated
  using (private.owns_user_vehicle(user_vehicle_id)) with check (private.owns_user_vehicle(user_vehicle_id));
create policy "maintenance_records: titolare" on public.maintenance_records for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and private.owns_user_vehicle(user_vehicle_id));
create policy "work_reports: parti" on public.work_reports for select to authenticated
  using (owner_id = (select auth.uid()) or author_id = (select auth.uid()));
create policy "documents: titolare" on public.user_vehicle_documents for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (user_vehicle_id is null or private.owns_user_vehicle(user_vehicle_id)));
create policy "reminders: titolare" on public.maintenance_reminders for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and private.owns_user_vehicle(user_vehicle_id));
create policy "expenses: titolare" on public.vehicle_expenses for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and private.owns_user_vehicle(user_vehicle_id));

revoke all on function public.set_primary_vehicle(uuid), public.complete_reminder(uuid),
  public.propose_work_report(uuid, date, public.maintenance_category, text, text, integer, text, bigint),
  public.decide_work_report(uuid, boolean, text, uuid) from public, anon;
grant execute on function public.set_primary_vehicle(uuid), public.complete_reminder(uuid),
  public.propose_work_report(uuid, date, public.maintenance_category, text, text, integer, text, bigint),
  public.decide_work_report(uuid, boolean, text, uuid) to authenticated;

-- Dati tecnici del veicolo collegato a una richiesta, visibili al professionista (senza targa e VIN).
create or replace function public.request_vehicle_info(request_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('make', uv.make, 'model', uv.model, 'version', uv.version, 'year', uv.year, 'fuel', uv.fuel,
                            'engine_code', uv.engine_code, 'power_kw', uv.power_kw, 'mileage_km', uv.current_mileage_km,
                            'transmission', uv.transmission)
    from public.requests r join public.user_vehicles uv on uv.id = r.user_vehicle_id
   where r.id = request_vehicle_info.request_id and (r.recipient_id = auth.uid() or r.requester_id = auth.uid());
$$;
grant execute on function public.request_vehicle_info(uuid) to authenticated;

-- Storage privato per documenti e foto del garage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-documents', 'vehicle-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "vehicle-documents: titolare scrive" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vehicle-documents: titolare legge" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vehicle-documents: titolare elimina" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- Job pianificati (pg_cron, disponibile su Supabase). In locale vengono
-- saltati se l'estensione non è installata.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('ag24-promemoria-giornalieri', '15 6 * * *', 'select private.process_reminders()');
    perform cron.schedule('ag24-annunci-scaduti', '30 2 * * *', 'select private.expire_listings()');
  end if;
end;
$$;

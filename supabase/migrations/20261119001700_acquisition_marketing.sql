-- =====================================================================
-- AutoGarage24 — Migrazione 0017 (Fasi 11–14)
-- CRM partner (estensione del Field Manager, nessun sistema duplicato),
-- candidature partner, Founding Partners, iscrizioni alla Beta,
-- analytics senza dati personali, centro marketing, notifiche allo staff,
-- strumenti amministrativi su annunci e attività recenti.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nuovi permessi
-- ---------------------------------------------------------------------
insert into public.role_permissions (role, permission)
select r::public.app_role, p
  from unnest(array['super_admin', 'admin']) r,
       unnest(array['acquisition.manage', 'marketing.manage', 'analytics.view']) p
on conflict do nothing;
insert into public.role_permissions (role, permission) values ('moderatore', 'analytics.view') on conflict do nothing;

-- ---------------------------------------------------------------------
-- Limite anti-abuso per moduli pubblici (utenti non autenticati).
-- La chiave contiene solo un hash: nessun indirizzo IP, nessuna email in chiaro.
-- ---------------------------------------------------------------------
create table private.anon_rate_limit (
  id         bigint generated always as identity primary key,
  key_hash   text not null,
  created_at timestamptz not null default now()
);
create index anon_rate_limit_idx on private.anon_rate_limit (key_hash, created_at desc);

create or replace function private.enforce_anon_limit(_key text, _max integer, _window interval)
returns void language plpgsql security definer set search_path = ''
as $$
declare _h text := md5(_key); _count integer;
begin
  select count(*) into _count from private.anon_rate_limit where key_hash = _h and created_at > now() - _window;
  if _count >= _max then
    raise exception 'Troppi invii in poco tempo. Riprova più tardi.' using errcode = '54000';
  end if;
  insert into private.anon_rate_limit (key_hash) values (_h);
  delete from private.anon_rate_limit where created_at < now() - interval '2 days' and id % 50 = 0;
end;
$$;
revoke all on function private.enforce_anon_limit(text, integer, interval) from public;

create or replace function private.clean_utm(_v text)
returns text language sql immutable set search_path = ''
as $$ select nullif(left(regexp_replace(lower(coalesce(_v, '')), '[^a-z0-9_.-]', '', 'g'), 80), '') $$;

create or replace function private.valid_email(_v text)
returns boolean language sql immutable set search_path = ''
as $$ select _v ~ '^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$' and char_length(_v) <= 254 $$;

-- ---------------------------------------------------------------------
-- Notifiche interne allo staff (Fase 13)
-- ---------------------------------------------------------------------
create or replace function private.notify_staff(_permission text, _title text, _body text, _link text, _dedupe text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _u uuid;
begin
  for _u in
    select distinct ur.user_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role = ur.role and rp.permission = _permission
      join public.profiles p on p.id = ur.user_id and p.account_status = 'attivo' and p.deleted_at is null
     where ur.user_id is distinct from auth.uid()
  loop
    perform private.notify(_u, 'amministrazione', _title, _body, _link, _dedupe);
  end loop;
end;
$$;
revoke all on function private.notify_staff(text, text, text, text, text) from public;

-- ---------------------------------------------------------------------
-- Analytics senza dati personali (Fasi 11, 12)
-- Nessun identificativo di utente, dispositivo o IP. Gli eventi lato
-- server sono scritti dai trigger; quelli lato browser passano da
-- track_event con un elenco chiuso di nomi.
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  event          text not null check (event ~ '^[a-z_]{3,40}$'),
  path           text check (char_length(path) <= 200 and path ~ '^/'),
  landing        text check (char_length(landing) <= 200 and landing ~ '^/'),
  utm_source     text check (char_length(utm_source) <= 80),
  utm_medium     text check (char_length(utm_medium) <= 80),
  utm_campaign   text check (char_length(utm_campaign) <= 80),
  utm_content    text check (char_length(utm_content) <= 80),
  referrer_host  text check (char_length(referrer_host) <= 120),
  device         text check (device in ('mobile', 'tablet', 'desktop')),
  is_entry       boolean not null default false,
  meta           jsonb not null default '{}'::jsonb check (pg_column_size(meta) <= 600)
);
create index analytics_events_time_idx on public.analytics_events (occurred_at desc);
create index analytics_events_event_idx on public.analytics_events (event, occurred_at desc);
create index analytics_events_campaign_idx on public.analytics_events (utm_campaign, occurred_at desc) where utm_campaign is not null;

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;
grant select on table public.analytics_events to authenticated;
create policy "analytics_events: lettura analytics" on public.analytics_events for select to authenticated
  using ((select private.has_permission('analytics.view')));

create or replace function private.track_server_event(_event text, _meta jsonb default '{}'::jsonb,
  _utm_source text default null, _utm_medium text default null, _utm_campaign text default null, _landing text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.analytics_events (event, meta, utm_source, utm_medium, utm_campaign, landing)
  values (_event, coalesce(_meta, '{}'::jsonb), private.clean_utm(_utm_source), private.clean_utm(_utm_medium),
          private.clean_utm(_utm_campaign), case when _landing ~ '^/[a-z0-9/_-]{0,199}$' then _landing end);
exception when others then
  -- La misurazione non deve mai bloccare un'operazione dell'utente.
  null;
end;
$$;
revoke all on function private.track_server_event(text, jsonb, text, text, text, text) from public;

create or replace function public.track_event(
  p_event text, p_path text, p_landing text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null, p_referrer_host text default null,
  p_device text default null, p_is_entry boolean default false, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_event not in ('page_view', 'cta_click', 'ricerca_auto', 'apertura_scheda_auto', 'ricerca_officine',
                     'ricerca_ricambi', 'apertura_profilo', 'calcolo_neopatentati', 'mappa_ricerca') then
    return;
  end if;
  if p_path is null or p_path !~ '^/[A-Za-z0-9/_.-]{0,199}$' then return; end if;
  -- Protezione dal volume anomalo: oltre 3000 eventi al minuto si scarta.
  if (select count(*) from public.analytics_events where occurred_at > now() - interval '1 minute') > 3000 then return; end if;
  insert into public.analytics_events (event, path, landing, utm_source, utm_medium, utm_campaign, utm_content,
                                       referrer_host, device, is_entry, meta)
  values (p_event, p_path,
          case when p_landing ~ '^/[A-Za-z0-9/_.-]{0,199}$' then p_landing end,
          private.clean_utm(p_utm_source), private.clean_utm(p_utm_medium), private.clean_utm(p_utm_campaign),
          private.clean_utm(p_utm_content),
          case when p_referrer_host ~ '^[a-z0-9.-]{3,120}$' then p_referrer_host end,
          case when p_device in ('mobile', 'tablet', 'desktop') then p_device end,
          coalesce(p_is_entry, false),
          case when jsonb_typeof(p_meta) = 'object' and pg_column_size(p_meta) <= 600 then p_meta else '{}'::jsonb end);
end;
$$;
revoke all on function public.track_event(text, text, text, text, text, text, text, text, text, boolean, jsonb) from public;
grant execute on function public.track_event(text, text, text, text, text, text, text, text, text, boolean, jsonb) to anon, authenticated;

-- Registrazione: evento con sorgente e ruolo, senza l'utente.
create or replace function private.track_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  perform private.track_server_event('registrazione',
    jsonb_build_object('ruolo', left(coalesce(_m ->> 'requested_role', 'cliente'), 30)),
    _m ->> 'utm_source', _m ->> 'utm_medium', _m ->> 'utm_campaign', _m ->> 'landing');
  return null;
end;
$$;
revoke all on function private.track_signup() from public;
create trigger on_auth_user_created_track after insert on auth.users
  for each row execute function private.track_signup();

create or replace function private.track_request_created()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.track_server_event('richiesta_inviata', jsonb_build_object('tipo', new.kind::text));
  return null;
end;
$$;
create trigger requests_track after insert on public.requests for each row execute function private.track_request_created();

-- ---------------------------------------------------------------------
-- CRM partner: estensione di field_contacts / field_visits (Fasi 11, 14)
-- ---------------------------------------------------------------------
alter table public.field_contacts drop constraint if exists field_contacts_status_check;
update public.field_contacts set status = case status
  when 'visita_programmata' then 'contattato' when 'visitato' then 'contattato'
  when 'collaborazione_attiva' then 'partner_attivo' else status end;
alter table public.field_contacts alter column status set default 'nuovo';
alter table public.field_contacts add constraint field_contacts_status_check check (status in (
  'nuovo', 'da_contattare', 'contattato', 'interessato', 'in_trattativa', 'in_attesa_registrazione',
  'registrato', 'partner_attivo', 'non_interessato'));

alter table public.field_contacts drop constraint if exists field_contacts_business_type_check;
alter table public.field_contacts add constraint field_contacts_business_type_check check (business_type in (
  'officina', 'concessionario', 'venditore_auto', 'meccanico', 'centro_specializzato', 'venditore_ricambi', 'altro'));

alter table public.field_contacts
  add column category_slug     text references public.business_categories (slug) on delete set null,
  add column tags              text[] not null default '{}' check (cardinality(tags) <= 10),
  add column postal_code       text check (postal_code ~ '^[0-9]{5}$'),
  add column province          text check (char_length(province) <= 40),
  add column website           text check (website ~ '^https?://' and char_length(website) <= 300),
  add column first_contact_on  date,
  add column source            text not null default 'manuale'
                               check (source in ('manuale', 'candidatura', 'field_manager', 'evento', 'passaparola', 'altro')),
  add column assigned_to       uuid references public.profiles (id) on delete set null,
  add column status_changed_at timestamptz not null default now(),
  add column lost_reason       text check (char_length(lost_reason) <= 500);
alter table public.field_contacts drop constraint if exists field_contacts_email_check;
alter table public.field_contacts drop constraint if exists field_contacts_phone_check;
alter table public.field_contacts
  add constraint field_contacts_email_check check (email is null or private.valid_email(email)),
  add constraint field_contacts_phone_check check (phone is null or phone ~ '^[0-9 +().-]{6,30}$');
create index field_contacts_assigned_idx on public.field_contacts (assigned_to, status);
create index field_contacts_email_idx on public.field_contacts (lower(email)) where email is not null;
create index field_contacts_category_idx on public.field_contacts (category_slug);

alter table public.field_visits drop constraint if exists field_visits_kind_check;
alter table public.field_visits add constraint field_visits_kind_check
  check (kind in ('visita', 'telefonata', 'email', 'whatsapp', 'appuntamento', 'nota'));
alter table public.field_visits alter column created_by set default auth.uid();
alter table public.field_visits
  add column met_contact_name   text check (char_length(met_contact_name) <= 120),
  add column cars_available     integer check (cars_available between 0 and 10000),
  add column neo_cars_available integer check (neo_cars_available between 0 and 10000),
  add column interest_level     text check (interest_level in ('alto', 'medio', 'basso', 'nessuno')),
  add column next_action        text check (char_length(next_action) <= 300),
  add column next_action_on     date,
  add constraint field_visits_neo_le_total check (neo_cars_available is null or cars_available is null or neo_cars_available <= cars_available);

-- Storico delle modifiche del contatto (immutabile).
create table public.field_contact_history (
  id          bigint generated always as identity primary key,
  contact_id  uuid not null references public.field_contacts (id) on delete cascade,
  changed_by  uuid references public.profiles (id) on delete set null,
  field       text not null check (field in ('creazione', 'status', 'assigned_to', 'category_slug', 'business_type', 'interazione', 'founding')),
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);
create index field_contact_history_idx on public.field_contact_history (contact_id, created_at desc);
create trigger field_contact_history_immutable before update or delete on public.field_contact_history
  for each row execute function private.audit_logs_immutable();

create or replace function private.field_contacts_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.status_changed_at := now();
  elsif new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  if new.status not in ('nuovo', 'da_contattare') and new.first_contact_on is null then
    new.first_contact_on := current_date;
  end if;
  if new.status <> 'non_interessato' then new.lost_reason := null; end if;
  return new;
end;
$$;
create trigger field_contacts_before_write before insert or update on public.field_contacts
  for each row execute function private.field_contacts_before_write();

create or replace function private.field_contacts_history()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.field_contact_history (contact_id, changed_by, field, new_value) values (new.id, auth.uid(), 'creazione', new.status);
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.field_contact_history (contact_id, changed_by, field, old_value, new_value) values (new.id, auth.uid(), 'status', old.status, new.status);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.field_contact_history (contact_id, changed_by, field, old_value, new_value) values (new.id, auth.uid(), 'assigned_to', old.assigned_to::text, new.assigned_to::text);
  end if;
  if new.category_slug is distinct from old.category_slug then
    insert into public.field_contact_history (contact_id, changed_by, field, old_value, new_value) values (new.id, auth.uid(), 'category_slug', old.category_slug, new.category_slug);
  end if;
  if new.business_type is distinct from old.business_type then
    insert into public.field_contact_history (contact_id, changed_by, field, old_value, new_value) values (new.id, auth.uid(), 'business_type', old.business_type, new.business_type);
  end if;
  return null;
end;
$$;
create trigger field_contacts_history after insert or update on public.field_contacts
  for each row execute function private.field_contacts_history();

create or replace function private.field_visits_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.field_contact_history (contact_id, changed_by, field, new_value)
  values (new.contact_id, auth.uid(), 'interazione', new.kind || coalesce(': ' || left(new.outcome, 200), ''));
  update public.field_contacts
     set next_followup_on = coalesce(new.next_action_on, next_followup_on),
         status = case when status in ('nuovo', 'da_contattare') and new.kind <> 'nota' then 'contattato' else status end
   where id = new.contact_id;
  return null;
end;
$$;
create trigger field_visits_after_insert after insert on public.field_visits
  for each row execute function private.field_visits_after_insert();

alter table public.field_contact_history enable row level security;
revoke all on table public.field_contact_history from anon, authenticated;
grant select on table public.field_contact_history to authenticated;
create policy "field_contact_history: lettura" on public.field_contact_history for select to authenticated
  using ((select private.has_permission('field.manage')) or (select private.has_permission('acquisition.manage')));

-- Chi gestisce l'acquisizione usa le stesse tabelle del Field Manager.
create policy "field_contacts: acquisizione" on public.field_contacts for all to authenticated
  using ((select private.has_permission('acquisition.manage'))) with check ((select private.has_permission('acquisition.manage')));
create policy "field_visits: acquisizione" on public.field_visits for all to authenticated
  using ((select private.has_permission('acquisition.manage'))) with check ((select private.has_permission('acquisition.manage')));

-- ---------------------------------------------------------------------
-- Candidature partner (/partner, /diventa-partner e landing)
-- ---------------------------------------------------------------------
create table public.partner_applications (
  id                   uuid primary key default gen_random_uuid(),
  program              text not null check (program in ('partner_auto', 'partner_professionisti', 'founding')),
  applicant_type       text not null check (applicant_type in ('concessionario', 'venditore_auto', 'officina', 'meccanico',
                                                               'centro_specializzato', 'venditore_ricambi', 'altro')),
  business_name        text not null check (char_length(business_name) between 2 and 160),
  contact_name         text not null check (char_length(contact_name) between 2 and 120),
  email                text not null check (private.valid_email(email)),
  phone                text not null check (phone ~ '^[0-9 +().-]{6,30}$'),
  address              text check (char_length(address) <= 200),
  city                 text not null check (char_length(city) between 2 and 80),
  cars_available       integer check (cars_available between 0 and 10000),
  message              text check (char_length(message) <= 2000),
  founding_interest    boolean not null default false,
  privacy_accepted_at  timestamptz not null,
  landing_path         text check (landing_path ~ '^/[a-z0-9/_-]{0,199}$'),
  utm_source           text, utm_medium text, utm_campaign text,
  status               text not null default 'nuova' check (status in ('nuova', 'in_esame', 'accettata', 'rifiutata', 'duplicata')),
  decision_note        text check (char_length(decision_note) <= 1000),
  reviewed_by          uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  contact_id           uuid references public.field_contacts (id) on delete set null,
  user_id              uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now()
);
create index partner_applications_status_idx on public.partner_applications (status, created_at desc);

alter table public.partner_applications enable row level security;
revoke all on table public.partner_applications from anon, authenticated;
grant select on table public.partner_applications to authenticated;
create policy "partner_applications: lettura acquisizione" on public.partner_applications for select to authenticated
  using ((select private.has_permission('acquisition.manage')));

create or replace function public.submit_partner_application(
  p_program text, p_applicant_type text, p_business_name text, p_contact_name text, p_email text, p_phone text,
  p_address text, p_city text, p_cars_available integer, p_message text, p_founding_interest boolean,
  p_privacy_accepted boolean, p_landing text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_website text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  _email text := lower(trim(p_email));
  _contact uuid;
  _id uuid;
  _type text := p_applicant_type;
begin
  -- Campo trappola per i bot: se compilato, si finge un invio riuscito senza salvare nulla.
  if coalesce(trim(p_website), '') <> '' then return null; end if;
  if not coalesce(p_privacy_accepted, false) then
    raise exception 'Per inviare la candidatura devi accettare l''informativa privacy' using errcode = '22023';
  end if;
  if not private.valid_email(_email) then raise exception 'Email non valida' using errcode = '22023'; end if;
  perform private.enforce_anon_limit('candidatura:' || _email, 3, interval '1 day');
  perform private.enforce_anon_limit('candidatura:globale', 200, interval '1 hour');

  select id into _contact from public.field_contacts where lower(email) = _email order by created_at limit 1;
  if _contact is null then
    insert into public.field_contacts (business_name, contact_name, phone, email, address, city, business_type, status, source, notes)
    values (trim(p_business_name), trim(p_contact_name), trim(p_phone), _email, nullif(trim(p_address), ''), trim(p_city),
            _type, 'nuovo', 'candidatura',
            case when p_cars_available is not null then 'Auto disponibili dichiarate: ' || p_cars_available end)
    returning id into _contact;
  end if;

  insert into public.partner_applications (program, applicant_type, business_name, contact_name, email, phone, address, city,
    cars_available, message, founding_interest, privacy_accepted_at, landing_path, utm_source, utm_medium, utm_campaign,
    contact_id, user_id)
  values (p_program, _type, trim(p_business_name), trim(p_contact_name), _email, trim(p_phone), nullif(trim(p_address), ''),
    trim(p_city), p_cars_available, nullif(trim(p_message), ''), coalesce(p_founding_interest, false), now(),
    case when p_landing ~ '^/[a-z0-9/_-]{0,199}$' then p_landing end,
    private.clean_utm(p_utm_source), private.clean_utm(p_utm_medium), private.clean_utm(p_utm_campaign), _contact, auth.uid())
  returning id into _id;

  insert into public.field_contact_history (contact_id, changed_by, field, new_value)
  values (_contact, null, 'interazione', 'candidatura ricevuta (' || p_program || ')');

  perform private.notify_staff('acquisition.manage', 'Nuova candidatura partner: ' || left(trim(p_business_name), 100),
    _type || ' — ' || trim(p_city), '/admin/acquisizione?tab=candidature', 'app:' || _id);
  perform private.track_server_event('candidatura_partner', jsonb_build_object('tipo', _type, 'programma', p_program),
    p_utm_source, p_utm_medium, p_utm_campaign, p_landing);
  return _id;
end;
$$;
revoke all on function public.submit_partner_application(text, text, text, text, text, text, text, text, integer, text, boolean, boolean, text, text, text, text, text) from public;
grant execute on function public.submit_partner_application(text, text, text, text, text, text, text, text, integer, text, boolean, boolean, text, text, text, text, text) to anon, authenticated;

create or replace function public.admin_review_application(application_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _a public.partner_applications%rowtype;
begin
  if not private.has_permission('acquisition.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if new_status not in ('in_esame', 'accettata', 'rifiutata', 'duplicata') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  if new_status = 'rifiutata' and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  select * into _a from public.partner_applications where id = application_id for update;
  if not found then raise exception 'Candidatura non trovata' using errcode = 'P0002'; end if;
  update public.partner_applications
     set status = new_status, decision_note = note, reviewed_by = auth.uid(), reviewed_at = now()
   where id = application_id;
  if new_status = 'accettata' and _a.contact_id is not null then
    update public.field_contacts set status = 'in_attesa_registrazione'
     where id = _a.contact_id and status in ('nuovo', 'da_contattare', 'contattato', 'interessato', 'in_trattativa');
  end if;
  perform private.log_admin_action('partner_application.reviewed', 'partner_applications', application_id::text,
    jsonb_build_object('status', new_status, 'note', note));
end;
$$;
revoke all on function public.admin_review_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_application(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Founding Partners: badge solo per partner ammessi esplicitamente
-- ---------------------------------------------------------------------
create table public.founding_partners (
  id                       uuid primary key default gen_random_uuid(),
  contact_id               uuid not null unique references public.field_contacts (id) on delete cascade,
  professional_profile_id  uuid unique references public.professional_profiles (id) on delete set null,
  status                   text not null default 'ammesso' check (status in ('ammesso', 'revocato')),
  admitted_at              timestamptz not null default now(),
  admitted_by              uuid references public.profiles (id) on delete set null,
  revoked_at               timestamptz,
  revoke_reason            text check (char_length(revoke_reason) <= 500),
  onboarding_notes         text check (char_length(onboarding_notes) <= 2000),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger founding_partners_set_updated_at before update on public.founding_partners for each row execute function private.set_updated_at();
alter table public.founding_partners enable row level security;
revoke all on table public.founding_partners from anon, authenticated;
grant select on table public.founding_partners to authenticated;
create policy "founding_partners: lettura acquisizione" on public.founding_partners for select to authenticated
  using ((select private.has_permission('acquisition.manage')));
create policy "founding_partners: lettura propria" on public.founding_partners for select to authenticated
  using (exists (select 1 from public.professional_profiles pp where pp.id = professional_profile_id and pp.user_id = (select auth.uid())));

create or replace function public.admin_set_founding_partner(
  contact_id uuid, profile_id uuid, admit boolean, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('acquisition.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if not exists (select 1 from public.field_contacts c where c.id = contact_id) then
    raise exception 'Contatto non trovato' using errcode = 'P0002';
  end if;
  if admit then
    if profile_id is not null and not exists (select 1 from public.professional_profiles p where p.id = profile_id) then
      raise exception 'Profilo professionale non trovato' using errcode = 'P0002';
    end if;
    insert into public.founding_partners (contact_id, professional_profile_id, admitted_by, onboarding_notes)
    values (admin_set_founding_partner.contact_id, profile_id, auth.uid(), note)
    on conflict on constraint founding_partners_contact_id_key do update
      set status = 'ammesso', professional_profile_id = coalesce(excluded.professional_profile_id, public.founding_partners.professional_profile_id),
          revoked_at = null, revoke_reason = null, admitted_by = auth.uid(), admitted_at = now(),
          onboarding_notes = coalesce(excluded.onboarding_notes, public.founding_partners.onboarding_notes);
  else
    if coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione della revoca' using errcode = '22023'; end if;
    update public.founding_partners f set status = 'revocato', revoked_at = now(), revoke_reason = note
     where f.contact_id = admin_set_founding_partner.contact_id;
  end if;
  insert into public.field_contact_history (contact_id, changed_by, field, new_value)
  values (admin_set_founding_partner.contact_id, auth.uid(), 'founding', case when admit then 'ammesso' else 'revocato' end);
  perform private.log_admin_action(case when admit then 'founding.admitted' else 'founding.revoked' end, 'field_contacts',
    contact_id::text, jsonb_build_object('profile_id', profile_id, 'note', note));
end;
$$;
revoke all on function public.admin_set_founding_partner(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_founding_partner(uuid, uuid, boolean, text) to authenticated;

-- Badge pubblico: solo profili pubblici e partner con stato "ammesso".
create or replace function public.founding_partner_profiles(profile_ids uuid[])
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select f.professional_profile_id from public.founding_partners f
   where f.status = 'ammesso' and f.professional_profile_id = any(profile_ids)
     and private.profile_is_public(f.professional_profile_id)
$$;
revoke all on function public.founding_partner_profiles(uuid[]) from public;
grant execute on function public.founding_partner_profiles(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Iscrizioni alla Beta
-- ---------------------------------------------------------------------
create table public.beta_signups (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null check (private.valid_email(email)),
  audience             text not null check (audience in ('cerco_auto', 'neopatentato', 'proprietario', 'professionista', 'altro')),
  city                 text check (char_length(city) <= 80),
  privacy_accepted_at  timestamptz not null,
  landing_path         text check (landing_path ~ '^/[a-z0-9/_-]{0,199}$'),
  utm_source           text, utm_medium text, utm_campaign text,
  status               text not null default 'iscritto' check (status in ('iscritto', 'invitato', 'attivo', 'annullato')),
  invited_at           timestamptz,
  created_at           timestamptz not null default now()
);
create unique index beta_signups_email_idx on public.beta_signups (lower(email));
alter table public.beta_signups enable row level security;
revoke all on table public.beta_signups from anon, authenticated;
grant select, update, delete on table public.beta_signups to authenticated;
create policy "beta_signups: gestione acquisizione" on public.beta_signups for all to authenticated
  using ((select private.has_permission('acquisition.manage'))) with check ((select private.has_permission('acquisition.manage')));

create or replace function public.join_beta(p_email text, p_audience text, p_city text, p_privacy_accepted boolean,
  p_landing text default null, p_utm_source text default null, p_utm_medium text default null, p_utm_campaign text default null,
  p_website text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _email text := lower(trim(p_email)); _new boolean;
begin
  if coalesce(trim(p_website), '') <> '' then return; end if;
  if not coalesce(p_privacy_accepted, false) then
    raise exception 'Per iscriverti devi accettare l''informativa privacy' using errcode = '22023';
  end if;
  if not private.valid_email(_email) then raise exception 'Email non valida' using errcode = '22023'; end if;
  perform private.enforce_anon_limit('beta:' || _email, 3, interval '1 day');
  perform private.enforce_anon_limit('beta:globale', 300, interval '1 hour');
  insert into public.beta_signups (email, audience, city, privacy_accepted_at, landing_path, utm_source, utm_medium, utm_campaign)
  values (_email, p_audience, nullif(left(trim(p_city), 80), ''), now(),
          case when p_landing ~ '^/[a-z0-9/_-]{0,199}$' then p_landing end,
          private.clean_utm(p_utm_source), private.clean_utm(p_utm_medium), private.clean_utm(p_utm_campaign))
  on conflict ((lower(email))) do nothing
  returning true into _new;
  -- Stessa risposta in entrambi i casi: non si rivela se un'email è già iscritta.
  if _new then
    perform private.track_server_event('iscrizione_beta', jsonb_build_object('pubblico', p_audience),
      p_utm_source, p_utm_medium, p_utm_campaign, p_landing);
  end if;
end;
$$;
revoke all on function public.join_beta(text, text, text, boolean, text, text, text, text, text) from public;
grant execute on function public.join_beta(text, text, text, boolean, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Centro marketing (Fase 12)
-- ---------------------------------------------------------------------
create type public.marketing_status as enum ('bozza', 'in_preparazione', 'da_approvare', 'approvato', 'pubblicato', 'archiviato');

create table public.marketing_campaigns (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(name) between 3 and 140),
  objective             text check (char_length(objective) <= 500),
  audience              text not null check (audience in ('neopatentati', 'acquirenti', 'proprietari', 'officine', 'meccanici',
                                                          'concessionari', 'ricambi', 'generale')),
  channels              text[] not null default '{}'
                        check (channels <@ array['instagram','facebook','tiktok','youtube','linkedin','google','email','whatsapp','sito','offline']),
  landing_path          text check (landing_path ~ '^/[a-z0-9/_-]{0,199}$'),
  utm_campaign          text unique check (utm_campaign ~ '^[a-z0-9_-]{3,60}$'),
  start_on              date,
  end_on                date,
  budget_planned_cents  bigint check (budget_planned_cents between 0 and 100000000000),
  status                public.marketing_status not null default 'bozza',
  notes                 text check (char_length(notes) <= 4000),
  approved_by           uuid references public.profiles (id) on delete set null,
  approved_at           timestamptz,
  published_at          timestamptz,
  created_by            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (end_on is null or start_on is null or end_on >= start_on),
  constraint marketing_campaigns_published check (status <> 'pubblicato' or published_at is not null)
);

create table public.marketing_items (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid references public.marketing_campaigns (id) on delete set null,
  kind               text not null check (kind in ('creativita', 'contenuto_social', 'video', 'materiale', 'landing', 'brief')),
  title              text not null check (char_length(title) between 3 and 160),
  audience           text check (audience in ('neopatentati', 'acquirenti', 'proprietari', 'officine', 'meccanici', 'concessionari', 'ricambi', 'generale')),
  service            text check (char_length(service) <= 60),
  objective          text check (char_length(objective) <= 60),
  channel            text check (channel in ('instagram','facebook','tiktok','youtube','linkedin','google','email','whatsapp','sito','offline')),
  format             text check (char_length(format) <= 40),
  tone               text check (char_length(tone) <= 40),
  planned_at         timestamptz,
  duration_seconds   integer check (duration_seconds between 1 and 3600),
  hook               text check (char_length(hook) <= 300),
  headline           text check (char_length(headline) <= 200),
  body               text check (char_length(body) <= 8000),
  cta                text check (char_length(cta) <= 120),
  visual_brief       text check (char_length(visual_brief) <= 4000),
  generation_prompt  text check (char_length(generation_prompt) <= 4000),
  variants           jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array' and pg_column_size(variants) <= 8000),
  asset_url          text check (asset_url ~ '^(https://|/)' and char_length(asset_url) <= 500),
  asset_origin       text check (asset_origin in ('higgsfield', 'fotografia_propria', 'licenza_acquistata', 'creato_internamente', 'altro')),
  asset_rights_note  text check (char_length(asset_rights_note) <= 500),
  published_url      text check (published_url ~ '^https://' and char_length(published_url) <= 500),
  status             public.marketing_status not null default 'bozza',
  notes              text check (char_length(notes) <= 4000),
  approved_by        uuid references public.profiles (id) on delete set null,
  approved_at        timestamptz,
  published_at       timestamptz,
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint marketing_items_published check (status <> 'pubblicato' or published_at is not null)
);
create index marketing_items_planned_idx on public.marketing_items (planned_at) where planned_at is not null;
create index marketing_items_kind_idx on public.marketing_items (kind, status);

create table public.growth_experiments (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid references public.marketing_campaigns (id) on delete set null,
  title              text not null check (char_length(title) between 3 and 160),
  hypothesis         text not null check (char_length(hypothesis) between 10 and 1000),
  audience           text check (char_length(audience) <= 60),
  change_description text not null check (char_length(change_description) between 5 and 1000),
  metric             text not null check (char_length(metric) between 3 and 120),
  variant_a          text not null check (char_length(variant_a) between 1 and 500),
  variant_b          text not null check (char_length(variant_b) between 1 and 500),
  start_on           date,
  end_on             date,
  sample_a           integer check (sample_a >= 0),
  sample_b           integer check (sample_b >= 0),
  conversions_a      integer check (conversions_a >= 0),
  conversions_b      integer check (conversions_b >= 0),
  status             text not null default 'pianificato' check (status in ('pianificato', 'in_corso', 'concluso', 'annullato')),
  decision           text not null default 'nessuna' check (decision in ('nessuna', 'adotta_a', 'adotta_b', 'ripeti', 'abbandona')),
  result_notes       text check (char_length(result_notes) <= 2000),
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (conversions_a is null or sample_a is null or conversions_a <= sample_a),
  check (conversions_b is null or sample_b is null or conversions_b <= sample_b),
  -- Nessuna variante "vincente" senza un campione minimo su entrambe le varianti.
  constraint growth_experiments_min_sample check (
    decision not in ('adotta_a', 'adotta_b') or (coalesce(sample_a, 0) >= 100 and coalesce(sample_b, 0) >= 100))
);

create table public.ad_budget_entries (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references public.marketing_campaigns (id) on delete set null,
  platform         text not null check (platform in ('meta', 'google', 'tiktok', 'youtube', 'linkedin', 'altro')),
  period_start     date not null,
  period_end       date not null,
  planned_cents    bigint not null check (planned_cents between 0 and 100000000000),
  actual_cents     bigint check (actual_cents between 0 and 100000000000),
  impressions      integer check (impressions >= 0),
  clicks           integer check (clicks >= 0),
  leads            integer check (leads >= 0),
  founder_approved boolean not null default false,
  approved_by      uuid references public.profiles (id) on delete set null,
  approved_at      timestamptz,
  notes            text check (char_length(notes) <= 2000),
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (period_end >= period_start)
);

create table public.marketing_status_history (
  id          bigint generated always as identity primary key,
  entity      text not null check (entity in ('campagna', 'contenuto', 'esperimento', 'budget')),
  entity_id   uuid not null,
  old_status  text,
  new_status  text not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index marketing_status_history_idx on public.marketing_status_history (entity, entity_id, created_at desc);
create trigger marketing_status_history_immutable before update or delete on public.marketing_status_history
  for each row execute function private.audit_logs_immutable();

-- Approvazione e pubblicazione: chi approva viene registrato; "pubblicato"
-- richiede una conferma manuale (data di pubblicazione).
create or replace function private.marketing_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _new text; _old text;
begin
  if tg_table_name = 'growth_experiments' then
    _new := new.status; _old := case when tg_op = 'UPDATE' then old.status end;
  elsif tg_table_name = 'ad_budget_entries' then
    _new := case when new.founder_approved then 'approvato' else 'bozza' end;
    _old := case when tg_op = 'UPDATE' then (case when old.founder_approved then 'approvato' else 'bozza' end) end;
    if new.founder_approved and (tg_op = 'INSERT' or not old.founder_approved) then
      new.approved_by := auth.uid(); new.approved_at := now();
    elsif not new.founder_approved then
      new.approved_by := null; new.approved_at := null;
    end if;
  else
    _new := new.status::text; _old := case when tg_op = 'UPDATE' then old.status::text end;
    if new.status in ('approvato', 'pubblicato') and (tg_op = 'INSERT' or old.status not in ('approvato', 'pubblicato')) then
      new.approved_by := auth.uid(); new.approved_at := now();
    elsif new.status in ('bozza', 'in_preparazione', 'da_approvare') then
      new.approved_by := null; new.approved_at := null; new.published_at := null;
    end if;
  end if;
  if _new is distinct from _old then
    insert into public.marketing_status_history (entity, entity_id, old_status, new_status, changed_by)
    values (case tg_table_name when 'marketing_campaigns' then 'campagna' when 'marketing_items' then 'contenuto'
                               when 'growth_experiments' then 'esperimento' else 'budget' end,
            new.id, _old, _new, auth.uid());
  end if;
  return new;
end;
$$;
create trigger marketing_campaigns_before_write before insert or update on public.marketing_campaigns for each row execute function private.marketing_before_write();
create trigger marketing_items_before_write before insert or update on public.marketing_items for each row execute function private.marketing_before_write();
create trigger growth_experiments_before_write before insert or update on public.growth_experiments for each row execute function private.marketing_before_write();
create trigger ad_budget_entries_before_write before insert or update on public.ad_budget_entries for each row execute function private.marketing_before_write();
create trigger marketing_campaigns_updated before update on public.marketing_campaigns for each row execute function private.set_updated_at();
create trigger marketing_items_updated before update on public.marketing_items for each row execute function private.set_updated_at();
create trigger growth_experiments_updated before update on public.growth_experiments for each row execute function private.set_updated_at();
create trigger ad_budget_entries_updated before update on public.ad_budget_entries for each row execute function private.set_updated_at();

do $$
declare _t text;
begin
  foreach _t in array array['marketing_campaigns', 'marketing_items', 'growth_experiments', 'ad_budget_entries'] loop
    execute format('alter table public.%I enable row level security', _t);
    execute format('revoke all on table public.%I from anon, authenticated', _t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', _t);
    execute format('create policy "%s: marketing" on public.%I for all to authenticated using ((select private.has_permission(''marketing.manage''))) with check ((select private.has_permission(''marketing.manage'')))', _t, _t);
  end loop;
end;
$$;
alter table public.marketing_status_history enable row level security;
revoke all on table public.marketing_status_history from anon, authenticated;
grant select on table public.marketing_status_history to authenticated;
create policy "marketing_status_history: lettura" on public.marketing_status_history for select to authenticated
  using ((select private.has_permission('marketing.manage')));

-- ---------------------------------------------------------------------
-- Notifiche allo staff: registrazioni, annunci, segnalazioni, assistenza
-- ---------------------------------------------------------------------
create or replace function private.staff_alert_professional()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _label text := replace(new.professional_type::text, '_', ' ');
begin
  if tg_op = 'INSERT' then
    perform private.notify_staff('professionals.verify', 'Nuova registrazione professionale (' || _label || ')',
      new.display_name, '/admin/professionisti', 'pro-new:' || new.id);
    perform private.track_server_event('registrazione_professionista', jsonb_build_object('tipo', new.professional_type::text));
  elsif new.review_status = 'inviato' and old.review_status is distinct from 'inviato' then
    perform private.notify_staff('professionals.verify', 'Profilo da approvare: ' || new.display_name, _label,
      '/admin/verifiche', 'pro-sub:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
    perform private.track_server_event('profilo_professionale_inviato', jsonb_build_object('tipo', new.professional_type::text));
  end if;
  return null;
end;
$$;
create trigger professional_profiles_staff_alert after insert or update of review_status on public.professional_profiles
  for each row execute function private.staff_alert_professional();

create or replace function private.staff_alert_listing()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'in_revisione' and old.status is distinct from 'in_revisione' then
    perform private.notify_staff('listings.moderate', 'Annuncio auto da approvare', new.title,
      '/admin/moderazione', 'lst-rev:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
  elsif new.status = 'pubblicato' and old.status is distinct from 'pubblicato' then
    perform private.notify_staff('listings.moderate', 'Nuovo veicolo pubblicato', new.title,
      '/auto/' || new.slug, 'lst-pub:' || new.id || ':' || to_char(now(), 'YYYYMMDD'));
    perform private.track_server_event('annuncio_pubblicato', jsonb_build_object('venditore', new.seller_kind::text));
  end if;
  return null;
end;
$$;
create trigger vehicle_listings_staff_alert after update of status on public.vehicle_listings
  for each row execute function private.staff_alert_listing();

create or replace function private.staff_alert_part()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'in_revisione' and old.status is distinct from 'in_revisione' then
    perform private.notify_staff('listings.moderate', 'Ricambio da approvare', new.title,
      '/admin/moderazione?tab=ricambi', 'part-rev:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
  elsif new.status = 'pubblicato' and old.status is distinct from 'pubblicato' then
    perform private.track_server_event('ricambio_pubblicato', '{}'::jsonb);
  end if;
  return null;
end;
$$;
create trigger part_listings_staff_alert after update of status on public.part_listings
  for each row execute function private.staff_alert_part();

create or replace function private.staff_alert_report()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.notify_staff('reports.manage', 'Nuova segnalazione: ' || replace(new.category, '_', ' '),
    coalesce(new.target_label, replace(new.target_type, '_', ' ')), '/admin/segnalazioni', 'rep:' || new.id);
  return null;
end;
$$;
create trigger content_reports_staff_alert after insert on public.content_reports
  for each row execute function private.staff_alert_report();

create or replace function private.staff_alert_ticket()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.notify_staff('support.manage', 'Nuova richiesta di assistenza', new.subject, '/admin/supporto', 'tkt:' || new.id);
  return null;
end;
$$;
create trigger support_tickets_staff_alert after insert on public.support_tickets
  for each row execute function private.staff_alert_ticket();

create or replace function private.staff_alert_verification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.notify_staff('professionals.verify', 'Nuova richiesta di verifica documenti',
    replace(new.verification_type::text, '_', ' '), '/admin/verifiche', 'ver:' || new.id);
  return null;
end;
$$;
create trigger verification_requests_staff_alert after insert on public.verification_requests
  for each row execute function private.staff_alert_verification();

-- ---------------------------------------------------------------------
-- Pannello: modifica e rimozione degli annunci con motivazione (Fase 13)
-- ---------------------------------------------------------------------
create or replace function public.admin_edit_listing(listing_id uuid, new_title text, new_description text,
  new_price_cents bigint, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _old record;
begin
  if not private.has_permission('listings.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then raise exception 'Indica la motivazione della modifica' using errcode = '22023'; end if;
  select title, description, price_cents, owner_id into _old from public.vehicle_listings where id = listing_id for update;
  if not found then raise exception 'Annuncio non trovato' using errcode = 'P0002'; end if;
  update public.vehicle_listings
     set title = coalesce(nullif(trim(new_title), ''), title),
         description = coalesce(new_description, description),
         price_cents = coalesce(new_price_cents, price_cents)
   where id = listing_id;
  perform private.notify(_old.owner_id, 'automobili', 'Il tuo annuncio è stato modificato dallo staff', reason,
    '/dashboard/annunci/' || listing_id, 'lst-edit:' || listing_id || ':' || to_char(now(), 'YYYYMMDDHH24MISS'));
  perform private.log_admin_action('listing.edited', 'vehicle_listings', listing_id::text,
    jsonb_build_object('reason', reason, 'before', jsonb_build_object('title', _old.title, 'price_cents', _old.price_cents,
      'description_len', char_length(_old.description))));
end;
$$;

-- Eliminazione definitiva: solo annunci non pubblici, con motivazione e copia nel registro.
create or replace function public.admin_delete_listing(listing_id uuid, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _l public.vehicle_listings%rowtype;
begin
  if not private.has_permission('listings.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if coalesce(char_length(trim(reason)), 0) < 10 then raise exception 'Indica una motivazione di almeno 10 caratteri' using errcode = '22023'; end if;
  select * into _l from public.vehicle_listings where id = listing_id for update;
  if not found then raise exception 'Annuncio non trovato' using errcode = 'P0002'; end if;
  if _l.status not in ('rifiutato', 'sospeso', 'scaduto', 'bozza') then
    raise exception 'Prima di eliminare un annuncio, sospendilo o rifiutalo' using errcode = '22023';
  end if;
  perform private.log_admin_action('listing.deleted', 'vehicle_listings', listing_id::text,
    jsonb_build_object('reason', reason, 'title', _l.title, 'owner_id', _l.owner_id, 'status', _l.status, 'slug', _l.slug));
  perform private.notify(_l.owner_id, 'automobili', 'Annuncio rimosso dallo staff', _l.title || ' — ' || reason,
    '/dashboard/annunci', 'lst-del:' || listing_id);
  delete from public.vehicle_listings where id = listing_id;
end;
$$;
revoke all on function public.admin_edit_listing(uuid, text, text, bigint, text) from public, anon;
revoke all on function public.admin_delete_listing(uuid, text) from public, anon;
grant execute on function public.admin_edit_listing(uuid, text, text, bigint, text) to authenticated;
grant execute on function public.admin_delete_listing(uuid, text) to authenticated;

-- Ultime registrazioni e attività (dati reali, senza email per chi non gestisce utenti).
create or replace function public.admin_recent_activity(max_rows integer default 10)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _n integer := least(greatest(max_rows, 1), 50); _users boolean := private.has_permission('users.view');
begin
  if not private.has_permission('stats.view') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  return jsonb_build_object(
    'registrations', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
        select p.id, coalesce(p.full_name, 'Utente') as name, case when _users then p.email end as email, p.created_at,
               (select array_agg(ur.role::text) from public.user_roles ur where ur.user_id = p.id) as roles
          from public.profiles p where p.deleted_at is null order by p.created_at desc limit _n) x),
    'activity', (select coalesce(jsonb_agg(y order by y.at desc), '[]') from (
        select * from (
          select 'annuncio' as kind, l.title as label, l.updated_at as at, '/admin/moderazione' as link, l.status::text as status
            from public.vehicle_listings l order by l.updated_at desc limit _n) a
        union all select * from (
          select 'richiesta', r.subject, r.created_at, null::text, r.status::text from public.requests r order by r.created_at desc limit _n) b
        union all select * from (
          select 'segnalazione', c.category, c.created_at, '/admin/segnalazioni', c.status from public.content_reports c order by c.created_at desc limit _n) c
        union all select * from (
          select 'assistenza', t.subject, t.created_at, '/admin/supporto', t.status from public.support_tickets t order by t.created_at desc limit _n) d
        union all select * from (
          select 'professionista', pp.display_name, pp.updated_at, '/admin/professionisti', pp.review_status::text
            from public.professional_profiles pp order by pp.updated_at desc limit _n) e
        order by at desc limit _n) y),
    'contact_requests', (select count(*) from public.requests where kind in ('info_auto', 'appuntamento_auto', 'info_ricambio')),
    'service_requests', (select count(*) from public.requests where kind in ('preventivo', 'appuntamento', 'assistenza', 'preventivo_ricambio')),
    'workshops', (select count(*) from public.professional_profiles where professional_type = 'officina' and is_published),
    'mechanics', (select count(*) from public.professional_profiles where professional_type = 'meccanico' and is_published),
    'vehicles_total', (select count(*) from public.vehicle_listings)
  );
end;
$$;
revoke all on function public.admin_recent_activity(integer) from public, anon;
grant execute on function public.admin_recent_activity(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Dashboard fondatore e analytics (Fasi 11, 12, 14)
-- ---------------------------------------------------------------------
create or replace function public.admin_growth_stats(days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _since timestamptz := now() - make_interval(days => least(greatest(days, 1), 730));
        _contacted bigint; _registered bigint;
begin
  if not (private.has_permission('analytics.view') or private.has_permission('acquisition.manage')) then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  select count(*) filter (where status not in ('nuovo', 'da_contattare')),
         count(*) filter (where status in ('registrato', 'partner_attivo'))
    into _contacted, _registered from public.field_contacts;
  return jsonb_build_object(
    'crm', jsonb_build_object(
      'total', (select count(*) from public.field_contacts),
      'by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.field_contacts group by status) s),
      'by_type', (select coalesce(jsonb_object_agg(business_type, n), '{}') from (select business_type, count(*) n from public.field_contacts group by business_type) s),
      'workshops_contacted', (select count(*) from public.field_contacts where business_type = 'officina' and status not in ('nuovo', 'da_contattare')),
      'new_period', (select count(*) from public.field_contacts where created_at >= _since),
      'contacted', _contacted,
      'registered', _registered,
      'active', (select count(*) from public.field_contacts where status = 'partner_attivo'),
      'conversion_rate', case when _contacted > 0 then round(_registered::numeric * 100 / _contacted, 1) end,
      'followups_overdue', (select count(*) from public.field_contacts where next_followup_on < current_date and status not in ('partner_attivo', 'non_interessato')),
      'interactions_period', (select count(*) from public.field_visits where created_at >= _since),
      'visits_period', (select count(*) from public.field_visits where kind = 'visita' and created_at >= _since),
      'cars_declared', (select coalesce(sum(cars_available), 0) from (select distinct on (contact_id) cars_available from public.field_visits where cars_available is not null order by contact_id, created_at desc) v),
      'neo_cars_declared', (select coalesce(sum(neo_cars_available), 0) from (select distinct on (contact_id) neo_cars_available from public.field_visits where neo_cars_available is not null order by contact_id, created_at desc) v)
    ),
    'applications', jsonb_build_object(
      'period', (select count(*) from public.partner_applications where created_at >= _since),
      'pending', (select count(*) from public.partner_applications where status in ('nuova', 'in_esame')),
      'accepted', (select count(*) from public.partner_applications where status = 'accettata')),
    'founding', jsonb_build_object('admitted', (select count(*) from public.founding_partners where status = 'ammesso'), 'target', 20),
    'beta_signups', (select count(*) from public.beta_signups where status <> 'annullato'),
    'platform', jsonb_build_object(
      'registrations_period', (select count(*) from public.profiles where created_at >= _since),
      'professionals_approved', (select count(*) from public.professional_profiles where review_status = 'approvato'),
      'workshops', (select count(*) from public.professional_profiles where professional_type = 'officina' and is_published),
      'mechanics', (select count(*) from public.professional_profiles where professional_type = 'meccanico' and is_published),
      'vehicles_published', (select count(*) from public.vehicle_listings where status = 'pubblicato'),
      'vehicles_neo', (select count(*) from public.vehicle_listings where status = 'pubblicato' and neo_result = 'compatibile'),
      'requests_period', (select count(*) from public.requests where created_at >= _since),
      'requests_answered_period', (select count(*) from public.requests where created_at >= _since and status not in ('nuova', 'visualizzata', 'annullata')),
      'quotes_accepted_period', (select count(*) from public.quotes where status = 'accettato' and decided_at >= _since)),
    'traffic', jsonb_build_object(
      'page_views', (select count(*) from public.analytics_events where event = 'page_view' and occurred_at >= _since),
      'entries', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since),
      'by_event', (select coalesce(jsonb_object_agg(event, n), '{}') from (select event, count(*) n from public.analytics_events where occurred_at >= _since group by event) s),
      'by_source', (select coalesce(jsonb_agg(s order by s.entries desc), '[]') from (
          select coalesce(utm_source, case when referrer_host is null then 'diretto' else referrer_host end) as source,
                 count(*) filter (where event = 'page_view' and is_entry) as entries,
                 count(*) filter (where event in ('registrazione', 'candidatura_partner', 'iscrizione_beta', 'richiesta_inviata')) as conversions
            from public.analytics_events where occurred_at >= _since group by 1 order by 2 desc limit 20) s),
      'by_campaign', (select coalesce(jsonb_agg(s order by s.entries desc), '[]') from (
          select utm_campaign as campaign,
                 count(*) filter (where event = 'page_view' and is_entry) as entries,
                 count(*) filter (where event = 'cta_click') as cta_clicks,
                 count(*) filter (where event in ('registrazione', 'candidatura_partner', 'iscrizione_beta')) as conversions
            from public.analytics_events where occurred_at >= _since and utm_campaign is not null group by 1 order by 2 desc limit 30) s),
      'by_landing', (select coalesce(jsonb_agg(s order by s.entries desc), '[]') from (
          select coalesce(landing, path) as landing,
                 count(*) filter (where event = 'page_view' and is_entry) as entries,
                 count(*) filter (where event = 'cta_click') as cta_clicks,
                 count(*) filter (where event in ('registrazione', 'candidatura_partner', 'iscrizione_beta')) as conversions
            from public.analytics_events where occurred_at >= _since and coalesce(landing, path) is not null group by 1 order by 2 desc limit 30) s),
      'by_device', (select coalesce(jsonb_object_agg(coalesce(device, 'sconosciuto'), n), '{}') from (select device, count(*) n from public.analytics_events where event = 'page_view' and occurred_at >= _since group by device) s),
      'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date,
                  'page_views', (select count(*) from public.analytics_events e where e.event = 'page_view' and e.occurred_at::date = d::date),
                  'registrations', (select count(*) from public.analytics_events e where e.event = 'registrazione' and e.occurred_at::date = d::date),
                  'applications', (select count(*) from public.analytics_events e where e.event = 'candidatura_partner' and e.occurred_at::date = d::date)) order by d), '[]')
                from generate_series(_since::date, current_date, interval '1 day') d))
  );
end;
$$;
revoke all on function public.admin_growth_stats(integer) from public, anon;
grant execute on function public.admin_growth_stats(integer) to authenticated;

-- Ruolo di servizio (script amministrativi e funzioni server): come nelle migrazioni precedenti.
grant all on table public.analytics_events, public.field_contact_history, public.partner_applications, public.founding_partners,
  public.beta_signups, public.marketing_campaigns, public.marketing_items, public.growth_experiments, public.ad_budget_entries,
  public.marketing_status_history to service_role;

-- Conservazione: gli eventi di analytics si cancellano dopo 25 mesi.
create or replace function private.purge_analytics()
returns void language sql security definer set search_path = ''
as $$ delete from public.analytics_events where occurred_at < now() - interval '25 months'; $$;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-pulizia-analytics', '17 3 * * 0', 'select private.purge_analytics()');
  end if;
end;
$$;

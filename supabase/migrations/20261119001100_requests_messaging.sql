-- =====================================================================
-- AutoGarage24 — Migrazione 0011 (Fasi 3, 5, 6, 7, 9): sistema unico di
-- richieste, preventivi, appuntamenti, conversazioni, messaggi,
-- notifiche, preferenze, coda email, attività e limiti anti-abuso.
-- =====================================================================

create type public.request_kind as enum (
  'info_auto', 'appuntamento_auto', 'preventivo', 'appuntamento', 'assistenza', 'info_ricambio', 'preventivo_ricambio');
create type public.request_status as enum (
  'nuova', 'visualizzata', 'in_lavorazione', 'risposta_inviata', 'preventivo_inviato', 'appuntamento_proposto',
  'accettata', 'rifiutata', 'completata', 'annullata');
create type public.time_slot as enum ('mattina', 'pomeriggio', 'sera', 'qualsiasi');
create type public.quote_status as enum ('inviato', 'accettato', 'rifiutato', 'sostituito', 'ritirato');
create type public.appointment_status as enum ('in_attesa', 'confermato', 'proposta_alternativa', 'rifiutato', 'annullato', 'completato');
create type public.notification_category as enum (
  'messaggi', 'richieste', 'preventivi', 'appuntamenti', 'automobili', 'ricambi', 'officine', 'meccanici',
  'manutenzione', 'amministrazione', 'account');
create type public.conversation_context as enum (
  'auto', 'officina', 'meccanico', 'ricambio', 'assistenza', 'supporto', 'generale');

-- ---------------------------------------------------------------------
-- Limiti anti-abuso (rate limiting lato database)
-- ---------------------------------------------------------------------
create table private.rate_limit_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_idx on private.rate_limit_events (user_id, action, created_at desc);

create or replace function private.enforce_rate_limit(_action text, _max integer, _window interval)
returns void language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := auth.uid(); _count integer;
begin
  if _uid is null then return; end if;
  select count(*) into _count from private.rate_limit_events
   where user_id = _uid and action = _action and created_at > now() - _window;
  if _count >= _max then
    raise exception 'Hai raggiunto il limite di operazioni consentite. Riprova più tardi.' using errcode = '54000';
  end if;
  insert into private.rate_limit_events (user_id, action) values (_uid, _action);
  delete from private.rate_limit_events where created_at < now() - interval '2 days' and id % 50 = 0;
end;
$$;

-- ---------------------------------------------------------------------
-- Notifiche, preferenze, coda email, attività
-- ---------------------------------------------------------------------
create table public.notification_preferences (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  in_app      jsonb not null default '{}'::jsonb,
  email       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
comment on table public.notification_preferences is
  'Preferenze per categoria (true/false). Valore assente = predefinito: in-app attive, email attive solo per richieste, preventivi, appuntamenti, manutenzione e account.';

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  category     public.notification_category not null,
  title        text not null check (char_length(title) <= 160),
  body         text check (char_length(body) <= 600),
  link         text check (link ~ '^/[^/]'),
  read_at      timestamptz,
  archived_at  timestamptz,
  dedupe_key   text,
  created_at   timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc) where archived_at is null;
create index notifications_unread_idx on public.notifications (user_id) where read_at is null and archived_at is null;

create table public.email_outbox (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  to_email     text not null,
  template     text not null check (template ~ '^[a-z_]+$'),
  subject      text not null check (char_length(subject) <= 200),
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'in_coda' check (status in ('in_coda', 'in_invio', 'inviata', 'errore', 'annullata')),
  attempts     integer not null default 0,
  last_error   text,
  dedupe_key   text unique,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index email_outbox_queue_idx on public.email_outbox (created_at) where status in ('in_coda', 'errore');

create table public.activity_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  event_type   text not null check (event_type ~ '^[a-z_.]+$'),
  title        text not null check (char_length(title) <= 200),
  link         text check (link ~ '^/[^/]'),
  created_at   timestamptz not null default now()
);
create index activity_events_user_idx on public.activity_events (user_id, created_at desc);

create or replace function private.pref_enabled(_user uuid, _channel text, _category public.notification_category)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select (case when _channel = 'email' then p.email else p.in_app end ->> _category::text)::boolean
       from public.notification_preferences p where p.user_id = _user),
    case when _channel = 'in_app' then true
         else _category in ('richieste', 'preventivi', 'appuntamenti', 'manutenzione', 'account') end);
$$;

create or replace function private.notify(
  _user uuid, _category public.notification_category, _title text, _body text, _link text,
  _dedupe text default null, _email_template text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _email text;
begin
  if _user is null then return; end if;
  if private.pref_enabled(_user, 'in_app', _category) then
    insert into public.notifications (user_id, category, title, body, link, dedupe_key)
    values (_user, _category, left(_title, 160), left(_body, 600), _link, _dedupe)
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  if _email_template is not null and private.pref_enabled(_user, 'email', _category) then
    select email into _email from public.profiles where id = _user and account_status = 'attivo';
    if _email is not null and _email <> '' then
      insert into public.email_outbox (user_id, to_email, template, subject, payload, dedupe_key)
      values (_user, _email, _email_template, left(_title, 200),
              jsonb_build_object('title', _title, 'body', _body, 'link', _link),
              case when _dedupe is null then null else _user::text || ':' || _dedupe end)
      on conflict (dedupe_key) do nothing;
    end if;
  end if;
end;
$$;

create or replace function private.log_activity(_user uuid, _type text, _title text, _link text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.activity_events (user_id, event_type, title, link)
  select _user, _type, left(_title, 200), _link where _user is not null;
$$;

-- ---------------------------------------------------------------------
-- Conversazioni e messaggi
-- ---------------------------------------------------------------------
create table public.conversations (
  id                       uuid primary key default gen_random_uuid(),
  context                  public.conversation_context not null default 'generale',
  subject                  text not null check (char_length(subject) <= 200),
  request_id               uuid unique,
  listing_id               uuid references public.vehicle_listings (id) on delete set null,
  professional_profile_id  uuid references public.professional_profiles (id) on delete set null,
  status                   text not null default 'aperta' check (status in ('aperta', 'chiusa')),
  created_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  last_message_at          timestamptz not null default now()
);
create index conversations_last_idx on public.conversations (last_message_at desc);

create table public.conversation_participants (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null default 'partecipante' check (role in ('partecipante', 'staff')),
  last_read_at     timestamptz,
  archived_at      timestamptz,
  joined_at        timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  sender_id         uuid references public.profiles (id) on delete set null,
  kind              text not null default 'testo' check (kind in ('testo', 'sistema')),
  body              text not null check (char_length(body) between 1 and 4000),
  attachment_path   text check (char_length(attachment_path) <= 400),
  attachment_name   text check (char_length(attachment_name) <= 255),
  attachment_mime   text check (attachment_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  attachment_size   integer check (attachment_size > 0 and attachment_size <= 10485760),
  created_at        timestamptz not null default now(),
  check ((attachment_path is null) = (attachment_mime is null)),
  check (attachment_path is null or split_part(attachment_path, '/', 1) = conversation_id::text)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.user_blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function private.is_participant(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.conversation_participants
                  where conversation_id = _conversation_id and user_id = (select auth.uid()));
$$;
grant execute on function private.is_participant(uuid) to authenticated, service_role;

-- Prima di inviare: partecipante, conversazione aperta, nessun blocco, limiti.
create or replace function private.messages_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind = 'sistema' then return new; end if;
  if new.sender_id is distinct from auth.uid() or not private.is_participant(new.conversation_id) then
    raise exception 'Non fai parte di questa conversazione' using errcode = '42501';
  end if;
  if (select status from public.conversations where id = new.conversation_id) <> 'aperta' then
    raise exception 'La conversazione è chiusa' using errcode = '22023';
  end if;
  if exists (select 1 from public.conversation_participants cp
             join public.user_blocks b on (b.blocker_id = cp.user_id and b.blocked_id = new.sender_id)
                                       or (b.blocker_id = new.sender_id and b.blocked_id = cp.user_id)
             where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id) then
    raise exception 'Non è possibile inviare messaggi a questo utente' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('message', 20, interval '1 minute');
  perform private.enforce_rate_limit('message_hour', 300, interval '1 hour');
  new.body := btrim(new.body);
  return new;
end;
$$;
create trigger messages_before_insert before insert on public.messages for each row execute function private.messages_before_insert();

create or replace function private.messages_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _p record; _subject text;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at, archived_at = null
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  update public.conversation_participants set archived_at = null
   where conversation_id = new.conversation_id and user_id <> coalesce(new.sender_id, '00000000-0000-0000-0000-000000000000'::uuid);
  if new.kind = 'testo' then
    select subject into _subject from public.conversations where id = new.conversation_id;
    for _p in select user_id from public.conversation_participants
               where conversation_id = new.conversation_id and user_id <> new.sender_id loop
      perform private.notify(_p.user_id, 'messaggi', 'Nuovo messaggio: ' || _subject, left(new.body, 140),
        '/dashboard/messaggi/' || new.conversation_id,
        'msg:' || new.conversation_id || ':' || to_char(date_trunc('hour', now()), 'YYYYMMDDHH24'), 'nuovo_messaggio');
    end loop;
  end if;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages for each row execute function private.messages_after_insert();

-- Avvio di una conversazione diretta (es. "Contatta l'officina").
-- Riutilizza una conversazione aperta già esistente sullo stesso contesto.
create or replace function public.start_conversation(
  target_profile_id uuid default null, target_listing_id uuid default null, first_message text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  _uid uuid := auth.uid();
  _other uuid; _context public.conversation_context; _subject text; _conv uuid;
begin
  if _uid is null or not private.is_active_user() then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if coalesce(trim(first_message), '') = '' then raise exception 'Scrivi un messaggio' using errcode = '22023'; end if;
  if target_listing_id is not null then
    select l.owner_id, 'auto', 'Annuncio: ' || l.title into _other, _context, _subject
      from public.vehicle_listings l where l.id = target_listing_id and l.status = 'pubblicato';
  elsif target_profile_id is not null then
    select pp.user_id,
           case pp.professional_type when 'officina' then 'officina' when 'meccanico' then 'meccanico'
                when 'venditore_ricambi' then 'ricambio' else 'generale' end::public.conversation_context,
           pp.display_name into _other, _context, _subject
      from public.professional_profiles pp where pp.id = target_profile_id and private.profile_is_public(pp.id);
  end if;
  if _other is null then raise exception 'Destinatario non disponibile' using errcode = 'P0002'; end if;
  if _other = _uid then raise exception 'Non puoi scrivere a te stesso' using errcode = '22023'; end if;
  perform private.enforce_rate_limit('conversation_start', 10, interval '1 hour');

  select c.id into _conv from public.conversations c
   where c.status = 'aperta' and c.request_id is null
     and c.listing_id is not distinct from target_listing_id
     and c.professional_profile_id is not distinct from target_profile_id
     and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = _uid)
     and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = _other)
   limit 1;
  if _conv is null then
    insert into public.conversations (context, subject, listing_id, professional_profile_id, created_by)
    values (_context, left(_subject, 200), target_listing_id, target_profile_id, _uid) returning id into _conv;
    insert into public.conversation_participants (conversation_id, user_id) values (_conv, _uid), (_conv, _other);
  end if;
  insert into public.messages (conversation_id, sender_id, body) values (_conv, _uid, first_message);
  return _conv;
end;
$$;

create or replace function public.mark_conversation_read(conversation_id uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.conversation_participants set last_read_at = now()
   where conversation_participants.conversation_id = mark_conversation_read.conversation_id and user_id = auth.uid();
$$;

create or replace function public.set_conversation_archived(conversation_id uuid, archived boolean)
returns void language sql security definer set search_path = ''
as $$
  update public.conversation_participants set archived_at = case when archived then now() else null end
   where conversation_participants.conversation_id = set_conversation_archived.conversation_id and user_id = auth.uid();
$$;

create or replace function public.close_conversation(conversation_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_participant(conversation_id) then raise exception 'Operazione non consentita' using errcode = '42501'; end if;
  update public.conversations set status = 'chiusa' where id = conversation_id;
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (conversation_id, auth.uid(), 'sistema', 'La conversazione è stata chiusa. La cronologia resta consultabile.');
end;
$$;

-- Accesso dello staff ai messaggi: solo con motivazione, sempre registrato.
create or replace function public.admin_read_conversation(conversation_id uuid, justification text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare _result jsonb;
begin
  if not private.has_permission('conversations.moderate') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(justification), '')) < 10 then
    raise exception 'Indica una motivazione dettagliata (es. numero della segnalazione)' using errcode = '22023';
  end if;
  perform private.log_admin_action('conversation.read', 'conversations', conversation_id::text,
    jsonb_build_object('justification', justification));
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'sender_id', m.sender_id, 'body', m.body, 'kind', m.kind,
           'attachment_name', m.attachment_name, 'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
    into _result from public.messages m where m.conversation_id = admin_read_conversation.conversation_id;
  return _result;
end;
$$;

-- ---------------------------------------------------------------------
-- Richieste strutturate
-- ---------------------------------------------------------------------
create table public.requests (
  id                       uuid primary key default gen_random_uuid(),
  kind                     public.request_kind not null,
  requester_id             uuid not null references public.profiles (id) on delete cascade,
  recipient_id             uuid references public.profiles (id) on delete cascade,
  professional_profile_id  uuid references public.professional_profiles (id) on delete set null,
  listing_id               uuid references public.vehicle_listings (id) on delete set null,
  service_id               uuid references public.professional_services (id) on delete set null,
  part_id                  uuid,
  user_vehicle_id          uuid,
  vehicle_make             text check (char_length(vehicle_make) <= 60),
  vehicle_model            text check (char_length(vehicle_model) <= 80),
  vehicle_year             integer check (vehicle_year between 1950 and 2100),
  subject                  text not null check (char_length(subject) between 3 and 200),
  message                  text not null check (char_length(message) between 5 and 4000),
  problem_started          text check (char_length(problem_started) <= 200),
  preferred_date           date,
  preferred_slot           public.time_slot,
  contact_preference       text not null default 'messaggio' check (contact_preference in ('messaggio', 'email', 'telefono')),
  location_text            text check (char_length(location_text) <= 200),
  work_mode                public.work_mode,
  part_code                text check (char_length(part_code) <= 60),
  status                   public.request_status not null default 'nuova',
  status_reason            text check (char_length(status_reason) <= 1000),
  conversation_id          uuid references public.conversations (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  completed_at             timestamptz,
  check (requester_id <> recipient_id)
);
create index requests_requester_idx on public.requests (requester_id, created_at desc);
create index requests_recipient_idx on public.requests (recipient_id, status, created_at desc);
create index requests_listing_idx on public.requests (listing_id);
create trigger requests_set_updated_at before update on public.requests for each row execute function private.set_updated_at();
alter table public.conversations add constraint conversations_request_fk foreign key (request_id) references public.requests (id) on delete set null;

create table public.request_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.requests (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  event       text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index request_events_idx on public.request_events (request_id, created_at);

create or replace function private.is_request_party(_request_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.requests r where r.id = _request_id
                 and (r.requester_id = (select auth.uid()) or r.recipient_id = (select auth.uid())));
$$;
grant execute on function private.is_request_party(uuid) to authenticated, service_role;

create or replace function private.request_category(_kind public.request_kind, _profile_id uuid)
returns public.notification_category language sql stable security definer set search_path = ''
as $$
  select case
    when _kind in ('info_auto', 'appuntamento_auto') then 'automobili'
    when _kind in ('info_ricambio', 'preventivo_ricambio') then 'ricambi'
    when (select professional_type from public.professional_profiles where id = _profile_id) = 'meccanico' then 'meccanici'
    when _profile_id is not null then 'officine'
    else 'richieste' end::public.notification_category;
$$;

-- Il destinatario è SEMPRE ricavato dal sistema (annuncio, profilo, ricambio).
create or replace function private.requests_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _title text;
begin
  if new.requester_id is distinct from auth.uid() then raise exception 'Operazione non consentita' using errcode = '42501'; end if;
  if not private.is_active_user() then raise exception 'Account non attivo' using errcode = '42501'; end if;
  new.status := 'nuova'; new.status_reason := null; new.conversation_id := null; new.completed_at := null;

  if new.kind in ('info_auto', 'appuntamento_auto') then
    select l.owner_id, l.title, l.professional_profile_id into new.recipient_id, _title, new.professional_profile_id
      from public.vehicle_listings l where l.id = new.listing_id and l.status = 'pubblicato';
    if new.recipient_id is null then raise exception 'Annuncio non disponibile' using errcode = 'P0002'; end if;
    if new.kind = 'appuntamento_auto' and new.preferred_date is null then
      raise exception 'Indica la data desiderata' using errcode = '22023';
    end if;
  elsif new.kind in ('info_ricambio', 'preventivo_ricambio') then
    execute 'select owner_id, professional_profile_id from public.part_listings where id = $1 and status = ''pubblicato'''
      into new.recipient_id, new.professional_profile_id using new.part_id;
    if new.recipient_id is null then raise exception 'Ricambio non disponibile' using errcode = 'P0002'; end if;
  else
    if not private.profile_is_public(new.professional_profile_id) then
      raise exception 'Professionista non disponibile' using errcode = 'P0002';
    end if;
    select user_id into new.recipient_id from public.professional_profiles where id = new.professional_profile_id;
    if new.service_id is not null and not exists (
      select 1 from public.professional_services s where s.id = new.service_id and s.profile_id = new.professional_profile_id and s.active) then
      raise exception 'Servizio non valido per questo professionista' using errcode = '22023';
    end if;
    if new.kind = 'appuntamento' and new.preferred_date is null then
      raise exception 'Indica la data desiderata' using errcode = '22023';
    end if;
  end if;
  if new.recipient_id = new.requester_id then raise exception 'Non puoi inviare una richiesta a te stesso' using errcode = '22023'; end if;
  if new.preferred_date is not null and new.preferred_date < current_date then
    raise exception 'La data desiderata non può essere nel passato' using errcode = '22023';
  end if;
  if new.user_vehicle_id is not null then
    execute 'select make, model, year from public.user_vehicles where id = $1 and owner_id = $2 and deleted_at is null'
      into new.vehicle_make, new.vehicle_model, new.vehicle_year using new.user_vehicle_id, new.requester_id;
    if new.vehicle_make is null then raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002'; end if;
  end if;

  -- Niente doppioni: una sola richiesta aperta per stesso oggetto e tipo.
  if exists (select 1 from public.requests r
             where r.requester_id = new.requester_id and r.kind = new.kind
               and r.status not in ('rifiutata', 'completata', 'annullata')
               and r.listing_id is not distinct from new.listing_id and r.part_id is not distinct from new.part_id
               and r.professional_profile_id is not distinct from new.professional_profile_id
               and r.service_id is not distinct from new.service_id) then
    raise exception 'Hai già una richiesta aperta per questo elemento: la trovi in La mia area › Richieste' using errcode = '23505';
  end if;
  perform private.enforce_rate_limit('request', 10, interval '1 hour');
  return new;
end;
$$;
create trigger requests_before_insert before insert on public.requests for each row execute function private.requests_before_insert();

create or replace function private.requests_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _conv uuid; _context public.conversation_context; _cat public.notification_category;
begin
  _cat := private.request_category(new.kind, new.professional_profile_id);
  _context := case _cat when 'automobili' then 'auto' when 'ricambi' then 'ricambio' when 'meccanici' then 'meccanico'
                        when 'officine' then 'officina' else 'generale' end;
  if new.kind = 'assistenza' then _context := 'assistenza'; end if;
  insert into public.conversations (context, subject, request_id, listing_id, professional_profile_id, created_by)
  values (_context, left(new.subject, 200), new.id, new.listing_id, new.professional_profile_id, new.requester_id)
  returning id into _conv;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values (_conv, new.requester_id, now()), (_conv, new.recipient_id, null);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (_conv, new.requester_id, 'sistema', new.message);
  update public.requests set conversation_id = _conv where id = new.id;
  insert into public.request_events (request_id, actor_id, event) values (new.id, new.requester_id, 'creata');

  perform private.notify(new.recipient_id, _cat, 'Nuova richiesta: ' || new.subject, left(new.message, 140),
    '/dashboard/richieste/' || new.id, 'req:' || new.id, 'nuova_richiesta');
  perform private.log_activity(new.recipient_id, 'request.received', 'Nuova richiesta ricevuta: ' || new.subject, '/dashboard/richieste/' || new.id);
  perform private.log_activity(new.requester_id, 'request.sent', 'Richiesta inviata: ' || new.subject, '/dashboard/richieste/' || new.id);
  return null;
end;
$$;
create trigger requests_after_insert after insert on public.requests for each row execute function private.requests_after_insert();

-- Cambio di stato con regole per ciascuna parte.
create or replace function public.update_request_status(request_id uuid, new_status public.request_status, reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _uid uuid := auth.uid(); _is_recipient boolean; _other uuid;
begin
  select * into _r from public.requests where id = request_id for update;
  if not found or (_r.requester_id <> _uid and _r.recipient_id <> _uid) then
    raise exception 'Richiesta non trovata' using errcode = 'P0002';
  end if;
  _is_recipient := _r.recipient_id = _uid;
  if _r.status in ('completata', 'annullata', 'rifiutata') then
    raise exception 'La richiesta è chiusa' using errcode = '22023';
  end if;
  if _is_recipient then
    if new_status not in ('visualizzata', 'in_lavorazione', 'risposta_inviata', 'rifiutata', 'completata') then
      raise exception 'Stato non consentito' using errcode = '42501';
    end if;
    if new_status = 'rifiutata' and coalesce(trim(reason), '') = '' then
      raise exception 'Indica il motivo del rifiuto' using errcode = '22023';
    end if;
    if new_status = 'completata' and _r.status <> 'accettata'
       and not exists (select 1 from public.appointments a where a.request_id = _r.id and a.status = 'confermato') then
      raise exception 'Si può completare solo una richiesta accettata o con appuntamento confermato' using errcode = '22023';
    end if;
    if new_status = 'visualizzata' and _r.status <> 'nuova' then return; end if;
  else
    if new_status <> 'annullata' then raise exception 'Stato non consentito' using errcode = '42501'; end if;
  end if;

  update public.requests set status = new_status, status_reason = reason,
         completed_at = case when new_status = 'completata' then now() else completed_at end
   where id = request_id;
  insert into public.request_events (request_id, actor_id, event, data)
  values (request_id, _uid, 'stato', jsonb_build_object('from', _r.status, 'to', new_status, 'reason', reason));
  if new_status <> 'visualizzata' then
    _other := case when _is_recipient then _r.requester_id else _r.recipient_id end;
    perform private.notify(_other, private.request_category(_r.kind, _r.professional_profile_id),
      'Richiesta aggiornata: ' || _r.subject, 'Nuovo stato: ' || replace(new_status::text, '_', ' '),
      '/dashboard/richieste/' || request_id, 'req-status:' || request_id || ':' || new_status, 'richiesta_aggiornata');
    if _r.conversation_id is not null then
      insert into public.messages (conversation_id, sender_id, kind, body)
      values (_r.conversation_id, _uid, 'sistema',
              'Stato della richiesta: ' || replace(new_status::text, '_', ' ') || coalesce(' — ' || reason, ''));
    end if;
    if new_status = 'completata' then
      perform private.log_activity(_r.requester_id, 'request.completed', 'Intervento completato: ' || _r.subject, '/dashboard/richieste/' || request_id);
      perform private.log_activity(_r.recipient_id, 'request.completed', 'Intervento completato: ' || _r.subject, '/dashboard/richieste/' || request_id);
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Preventivi (con storico: ogni nuovo preventivo sostituisce il precedente)
-- ---------------------------------------------------------------------
create table public.quotes (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.requests (id) on delete cascade,
  sender_id          uuid not null references public.profiles (id) on delete cascade,
  amount_cents       bigint not null check (amount_cents >= 0 and amount_cents < 10000000000),
  extra_costs_cents  bigint check (extra_costs_cents >= 0),
  description        text not null check (char_length(description) between 3 and 3000),
  materials          text check (char_length(materials) <= 2000),
  duration_text      text check (char_length(duration_text) <= 120),
  availability_text  text check (char_length(availability_text) <= 300),
  conditions         text check (char_length(conditions) <= 2000),
  valid_until        date,
  status             public.quote_status not null default 'inviato',
  decision_note      text check (char_length(decision_note) <= 1000),
  created_at         timestamptz not null default now(),
  decided_at         timestamptz
);
create index quotes_request_idx on public.quotes (request_id, created_at desc);

create or replace function public.send_quote(
  request_id uuid, amount_cents bigint, description text, extra_costs_cents bigint default null, materials text default null,
  duration_text text default null, availability_text text default null, conditions text default null, valid_until date default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _id uuid;
begin
  select * into _r from public.requests where id = request_id for update;
  if not found or _r.recipient_id <> auth.uid() then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status in ('completata', 'annullata', 'rifiutata') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  if valid_until is not null and valid_until < current_date then raise exception 'Validità non corretta' using errcode = '22023'; end if;
  update public.quotes set status = 'sostituito' where quotes.request_id = send_quote.request_id and status = 'inviato';
  insert into public.quotes (request_id, sender_id, amount_cents, extra_costs_cents, description, materials, duration_text,
                             availability_text, conditions, valid_until)
  values (request_id, auth.uid(), amount_cents, extra_costs_cents, description, materials, duration_text, availability_text,
          conditions, valid_until)
  returning id into _id;
  update public.requests set status = 'preventivo_inviato' where id = request_id;
  insert into public.request_events (request_id, actor_id, event, data)
  values (request_id, auth.uid(), 'preventivo_inviato', jsonb_build_object('quote_id', _id, 'amount_cents', amount_cents));
  if _r.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (_r.conversation_id, auth.uid(), 'sistema',
            'Preventivo inviato: € ' || to_char(amount_cents / 100.0, 'FM999G999G990D00') || ' — ' || left(description, 300));
  end if;
  perform private.notify(_r.requester_id, 'preventivi', 'Hai ricevuto un preventivo', _r.subject,
    '/dashboard/richieste/' || request_id, 'quote:' || _id, 'preventivo_ricevuto');
  perform private.log_activity(_r.recipient_id, 'quote.sent', 'Preventivo inviato: ' || _r.subject, '/dashboard/richieste/' || request_id);
  return _id;
end;
$$;

create or replace function public.respond_quote(quote_id uuid, accept boolean, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _q public.quotes%rowtype; _r public.requests%rowtype;
begin
  select * into _q from public.quotes where id = quote_id for update;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  select * into _r from public.requests where id = _q.request_id for update;
  if _r.requester_id <> auth.uid() then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  if _q.status <> 'inviato' then raise exception 'Il preventivo non è più valido' using errcode = '22023'; end if;
  if _q.valid_until is not null and _q.valid_until < current_date then raise exception 'Il preventivo è scaduto' using errcode = '22023'; end if;
  update public.quotes set status = case when accept then 'accettato' else 'rifiutato' end::public.quote_status,
         decision_note = note, decided_at = now() where id = quote_id;
  if accept then update public.requests set status = 'accettata' where id = _r.id; end if;
  insert into public.request_events (request_id, actor_id, event, data)
  values (_r.id, auth.uid(), case when accept then 'preventivo_accettato' else 'preventivo_rifiutato' end, jsonb_build_object('quote_id', quote_id));
  if _r.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (_r.conversation_id, auth.uid(), 'sistema',
            case when accept then 'Il cliente ha accettato il preventivo. Nessun pagamento avviene tramite AutoGarage24.'
                 else 'Il cliente ha rifiutato il preventivo.' end || coalesce(' — ' || note, ''));
  end if;
  perform private.notify(_q.sender_id, 'preventivi',
    case when accept then 'Preventivo accettato' else 'Preventivo rifiutato' end, _r.subject,
    '/dashboard/richieste/' || _r.id, 'quote-decision:' || quote_id, 'preventivo_risposta');
  perform private.log_activity(_q.sender_id, case when accept then 'quote.accepted' else 'quote.rejected' end,
    case when accept then 'Preventivo accettato: ' else 'Preventivo rifiutato: ' end || _r.subject, '/dashboard/richieste/' || _r.id);
end;
$$;

-- ---------------------------------------------------------------------
-- Appuntamenti: confermati solo con accettazione esplicita dell'altra parte
-- (se propone il cliente, deve accettare il professionista).
-- ---------------------------------------------------------------------
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.requests (id) on delete cascade,
  proposed_by      uuid not null references public.profiles (id) on delete cascade,
  proposed_date    date not null,
  slot             public.time_slot not null default 'qualsiasi',
  time_text        text check (char_length(time_text) <= 40),
  note             text check (char_length(note) <= 1000),
  status           public.appointment_status not null default 'in_attesa',
  decision_reason  text check (char_length(decision_reason) <= 1000),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz
);
create index appointments_request_idx on public.appointments (request_id, created_at desc);
create index appointments_status_idx on public.appointments (status, proposed_date);

create or replace function public.propose_appointment(request_id uuid, proposed_date date, slot public.time_slot,
                                                     time_text text default null, note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _id uuid; _other uuid;
begin
  select * into _r from public.requests where id = request_id for update;
  if not found or auth.uid() not in (_r.requester_id, _r.recipient_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status in ('completata', 'annullata', 'rifiutata') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  if proposed_date < current_date then raise exception 'La data non può essere nel passato' using errcode = '22023'; end if;
  update public.appointments set status = 'proposta_alternativa', decided_at = now()
   where appointments.request_id = propose_appointment.request_id and status = 'in_attesa';
  insert into public.appointments (request_id, proposed_by, proposed_date, slot, time_text, note)
  values (request_id, auth.uid(), proposed_date, slot, time_text, note) returning id into _id;
  update public.requests set status = 'appuntamento_proposto' where id = request_id;
  insert into public.request_events (request_id, actor_id, event, data)
  values (request_id, auth.uid(), 'appuntamento_proposto', jsonb_build_object('date', proposed_date, 'slot', slot));
  _other := case when auth.uid() = _r.requester_id then _r.recipient_id else _r.requester_id end;
  if _r.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (_r.conversation_id, auth.uid(), 'sistema',
            'Proposta di appuntamento: ' || to_char(proposed_date, 'DD/MM/YYYY') || ' (' || slot || coalesce(', ' || time_text, '')
            || '). In attesa di conferma: non è ancora una prenotazione.');
  end if;
  perform private.notify(_other, 'appuntamenti', 'Proposta di appuntamento', _r.subject,
    '/dashboard/richieste/' || request_id, 'appt:' || _id, 'appuntamento_richiesto');
  return _id;
end;
$$;

create or replace function public.respond_appointment(appointment_id uuid, action text, reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _a public.appointments%rowtype; _r public.requests%rowtype; _uid uuid := auth.uid(); _new public.appointment_status; _other uuid;
begin
  select * into _a from public.appointments where id = appointment_id for update;
  if not found then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;
  select * into _r from public.requests where id = _a.request_id for update;
  if _uid not in (_r.requester_id, _r.recipient_id) then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;

  if action in ('conferma', 'rifiuta') then
    if _a.status <> 'in_attesa' then raise exception 'L''appuntamento non è in attesa' using errcode = '22023'; end if;
    if _a.proposed_by = _uid then raise exception 'La conferma spetta all''altra parte' using errcode = '42501'; end if;
    _new := case when action = 'conferma' then 'confermato' else 'rifiutato' end;
    if action = 'conferma' and exists (
      select 1 from public.appointments a2 join public.requests r2 on r2.id = a2.request_id
      join public.professional_profiles pp on pp.id = r2.professional_profile_id and pp.accepts_appointments
      where r2.recipient_id = _r.recipient_id and a2.status = 'confermato' and a2.id <> _a.id
        and a2.proposed_date = _a.proposed_date and a2.slot = _a.slot and _a.slot <> 'qualsiasi') then
      raise exception 'Esiste già un appuntamento confermato nella stessa fascia oraria' using errcode = '23P01';
    end if;
  elsif action = 'annulla' then
    if _a.status not in ('in_attesa', 'confermato') then raise exception 'Operazione non consentita' using errcode = '22023'; end if;
    if coalesce(trim(reason), '') = '' then raise exception 'Indica il motivo dell''annullamento' using errcode = '22023'; end if;
    _new := 'annullato';
  elsif action = 'completa' then
    if _uid <> _r.recipient_id or _a.status <> 'confermato' then raise exception 'Operazione non consentita' using errcode = '42501'; end if;
    _new := 'completato';
  else
    raise exception 'Azione non valida' using errcode = '22023';
  end if;

  update public.appointments set status = _new, decision_reason = reason, decided_at = now() where id = appointment_id;
  insert into public.request_events (request_id, actor_id, event, data)
  values (_r.id, _uid, 'appuntamento_' || _new, jsonb_build_object('appointment_id', appointment_id, 'reason', reason));
  _other := case when _uid = _r.requester_id then _r.recipient_id else _r.requester_id end;
  if _r.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (_r.conversation_id, _uid, 'sistema', 'Appuntamento del ' || to_char(_a.proposed_date, 'DD/MM/YYYY') || ': '
            || replace(_new::text, '_', ' ') || coalesce(' — ' || reason, ''));
  end if;
  perform private.notify(_other, 'appuntamenti', 'Appuntamento ' || replace(_new::text, '_', ' '), _r.subject,
    '/dashboard/richieste/' || _r.id, 'appt-' || _new || ':' || appointment_id, 'appuntamento_aggiornato');
  if _new = 'confermato' then
    perform private.log_activity(_r.requester_id, 'appointment.confirmed', 'Appuntamento confermato: ' || _r.subject, '/dashboard/richieste/' || _r.id);
    perform private.log_activity(_r.recipient_id, 'appointment.confirmed', 'Appuntamento confermato: ' || _r.subject, '/dashboard/richieste/' || _r.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Notifiche automatiche su annunci e profili
-- ---------------------------------------------------------------------
create or replace function private.listing_status_notify()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approvato', 'pubblicato', 'rifiutato', 'sospeso', 'scaduto')
     and coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) <> new.owner_id then
    perform private.notify(new.owner_id, 'automobili',
      'Annuncio ' || replace(new.status::text, '_', ' ') || ': ' || new.title, new.status_note,
      '/dashboard/annunci/' || new.id, 'listing:' || new.id || ':' || new.status || ':' || to_char(now(), 'YYYYMMDDHH24MI'),
      'annuncio_aggiornato');
  end if;
  if new.status = 'pubblicato' and old.status is distinct from 'pubblicato' then
    perform private.log_activity(new.owner_id, 'listing.published', 'Annuncio pubblicato: ' || new.title, '/auto/' || new.slug);
  elsif new.status = 'venduto' and old.status is distinct from 'venduto' then
    perform private.log_activity(new.owner_id, 'listing.sold', 'Automobile venduta: ' || new.title, '/dashboard/annunci/' || new.id);
  end if;
  return null;
end;
$$;
create trigger vehicle_listings_notify after update of status on public.vehicle_listings
  for each row execute function private.listing_status_notify();

create or replace function private.profile_review_notify()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.review_status is distinct from old.review_status and new.review_status in ('approvato', 'rifiutato', 'sospeso', 'in_verifica') then
    perform private.notify(new.user_id, 'account', 'Profilo professionale: ' || replace(new.review_status::text, '_', ' '),
      new.review_note, '/dashboard/profilo-professionale', 'profile:' || new.id || ':' || new.review_status || ':' || to_char(now(), 'YYYYMMDDHH24MI'),
      'profilo_aggiornato');
    if new.review_status = 'approvato' then
      perform private.log_activity(new.user_id, 'profile.approved', 'Profilo professionale approvato', '/dashboard/profilo-professionale');
    end if;
  end if;
  return null;
end;
$$;
create trigger professional_profiles_review_notify after update of review_status on public.professional_profiles
  for each row execute function private.profile_review_notify();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.activity_events enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.requests enable row level security;
alter table public.request_events enable row level security;
alter table public.quotes enable row level security;
alter table public.appointments enable row level security;
alter table private.rate_limit_events enable row level security;

revoke all on table public.notification_preferences, public.notifications, public.email_outbox, public.activity_events,
  public.conversations, public.conversation_participants, public.messages, public.user_blocks, public.requests,
  public.request_events, public.quotes, public.appointments from anon, authenticated;
grant all on table public.notification_preferences, public.notifications, public.email_outbox, public.activity_events,
  public.conversations, public.conversation_participants, public.messages, public.user_blocks, public.requests,
  public.request_events, public.quotes, public.appointments to service_role;

grant select, insert, update, delete on table public.notification_preferences to authenticated;
create policy "notification_preferences: titolare" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, delete on table public.notifications to authenticated;
grant update (read_at, archived_at) on table public.notifications to authenticated;
create policy "notifications: lettura titolare" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: aggiornamento titolare" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: eliminazione titolare" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

grant select on table public.email_outbox to authenticated;
create policy "email_outbox: monitoraggio staff" on public.email_outbox for select to authenticated
  using ((select private.has_permission('stats.view')));

grant select on table public.activity_events to authenticated;
create policy "activity_events: titolare" on public.activity_events for select to authenticated using (user_id = (select auth.uid()));

grant select on table public.conversations to authenticated;
create policy "conversations: partecipanti" on public.conversations for select to authenticated using (private.is_participant(id));

grant select on table public.conversation_participants to authenticated;
create policy "participants: partecipanti della conversazione" on public.conversation_participants for select to authenticated
  using (private.is_participant(conversation_id));

grant select, insert on table public.messages to authenticated;
create policy "messages: lettura partecipanti" on public.messages for select to authenticated using (private.is_participant(conversation_id));
create policy "messages: invio partecipanti" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and kind = 'testo' and private.is_participant(conversation_id));

grant select, insert, delete on table public.user_blocks to authenticated;
create policy "user_blocks: titolare" on public.user_blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

grant select, insert on table public.requests to authenticated;
create policy "requests: parti coinvolte" on public.requests for select to authenticated
  using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "requests: lettura staff" on public.requests for select to authenticated
  using ((select private.has_permission('support.manage')) or (select private.has_permission('stats.view')));
create policy "requests: creazione" on public.requests for insert to authenticated with check (requester_id = (select auth.uid()));

grant select on table public.request_events, public.quotes, public.appointments to authenticated;
create policy "request_events: parti" on public.request_events for select to authenticated using (private.is_request_party(request_id));
create policy "quotes: parti" on public.quotes for select to authenticated using (private.is_request_party(request_id));
create policy "appointments: parti" on public.appointments for select to authenticated using (private.is_request_party(request_id));

revoke all on function public.start_conversation(uuid, uuid, text), public.mark_conversation_read(uuid),
  public.set_conversation_archived(uuid, boolean), public.close_conversation(uuid), public.admin_read_conversation(uuid, text),
  public.update_request_status(uuid, public.request_status, text),
  public.send_quote(uuid, bigint, text, bigint, text, text, text, text, date), public.respond_quote(uuid, boolean, text),
  public.propose_appointment(uuid, date, public.time_slot, text, text), public.respond_appointment(uuid, text, text)
  from public, anon;
grant execute on function public.start_conversation(uuid, uuid, text), public.mark_conversation_read(uuid),
  public.set_conversation_archived(uuid, boolean), public.close_conversation(uuid), public.admin_read_conversation(uuid, text),
  public.update_request_status(uuid, public.request_status, text),
  public.send_quote(uuid, bigint, text, bigint, text, text, text, text, date), public.respond_quote(uuid, boolean, text),
  public.propose_appointment(uuid, date, public.time_slot, text, text), public.respond_appointment(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- Allegati dei messaggi: bucket PRIVATO, percorso "<conversation_id>/<file>"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('message-attachments', 'message-attachments', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "message-attachments: caricamento partecipanti" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments'
              and private.is_participant(nullif((storage.foldername(name))[1], '')::uuid));
create policy "message-attachments: lettura partecipanti" on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments'
         and private.is_participant(nullif((storage.foldername(name))[1], '')::uuid));

-- ---------------------------------------------------------------------
-- Realtime: messaggi e notifiche (le RLS si applicano anche al realtime)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.notifications, public.conversation_participants;
  end if;
end;
$$;

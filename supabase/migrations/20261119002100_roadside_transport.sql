-- =====================================================================
-- Migrazione 0021 — Fasi 23 e 29 (soccorso stradale) e Fase 28 (trasporto auto)
--
-- Principi:
--  * nessun operatore inventato: solo profili professionali reali, approvati e
--    verificati dallo staff per il servizio specifico;
--  * la disponibilità è dichiarata dall'operatore e scade da sola;
--  * la posizione dell'utente è usata solo con consenso: ai candidati arriva una
--    zona approssimata (~1 km), l'indirizzo e le coordinate esatte solo
--    all'operatore scelto; la posizione dell'operatore è condivisa solo durante
--    l'intervento attivo e cancellata alla chiusura;
--  * nessun pagamento, nessun deposito, nessun escrow: i prezzi sono preventivi
--    dell'operatore e il pagamento avviene fuori piattaforma.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Conversazione di servizio (riusa il sistema messaggi esistente)
-- ---------------------------------------------------------------------
create or replace function private.open_service_conversation(_client uuid, _operator_user uuid, _profile uuid, _subject text, _first text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _conv uuid;
begin
  insert into public.conversations (context, subject, professional_profile_id, created_by)
  values ('assistenza', left(_subject, 200), _profile, _client) returning id into _conv;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values (_conv, _client, now()), (_conv, _operator_user, null)
  on conflict do nothing;
  insert into public.messages (conversation_id, sender_id, kind, body) values (_conv, _client, 'sistema', left(_first, 4000));
  return _conv;
end;
$$;

-- =====================================================================
-- FASI 23 + 29 — SOCCORSO STRADALE
-- =====================================================================
create table public.roadside_operators (
  profile_id      uuid primary key references public.professional_profiles (id) on delete cascade,
  services        text[] not null check (cardinality(services) between 1 and 10 and services <@ array[
                    'carro_attrezzi', 'soccorso_meccanico', 'avviamento_batteria', 'cambio_gomma', 'rifornimento',
                    'apertura_veicolo', 'recupero_veicolo', 'trasporto_officina']::text[]),
  vehicle_types   text[] not null default '{auto}' check (cardinality(vehicle_types) between 1 and 5 and vehicle_types <@ array['auto', 'moto', 'furgone', 'suv', 'elettrica']::text[]),
  h24             boolean not null default false,
  available_until timestamptz,
  hours_text      text check (char_length(hours_text) <= 300),
  price_notes     text check (char_length(price_notes) <= 1000),
  status          text not null default 'in_revisione' check (status in ('in_revisione', 'attivo', 'sospeso', 'rifiutato')),
  admin_note      text check (char_length(admin_note) <= 500),
  verified_at     timestamptz,
  verified_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger roadside_operators_updated before update on public.roadside_operators for each row execute function private.set_updated_at();

-- L'operatore gestisce servizi e disponibilità; stato e verifica solo dallo staff.
create or replace function private.roadside_operators_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _type public.app_role;
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  select professional_type into _type from public.professional_profiles where id = new.profile_id;
  if _type is null or _type::text not in ('soccorritore', 'officina', 'meccanico') then
    raise exception 'Il soccorso stradale è disponibile per soccorritori, officine e meccanici' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.status := 'in_revisione'; new.verified_at := null; new.verified_by := null; new.admin_note := null;
    perform private.notify_staff('services.manage', 'Nuovo operatore di soccorso da verificare',
      (select display_name from public.professional_profiles where id = new.profile_id), '/admin/servizi', 'roadside-op:' || new.profile_id);
  else
    new.status := old.status; new.verified_at := old.verified_at; new.verified_by := old.verified_by; new.admin_note := old.admin_note;
  end if;
  if new.available_until is not null and new.available_until > now() + interval '24 hours' then
    raise exception 'La disponibilità si dichiara al massimo per 24 ore (poi va rinnovata)' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger roadside_operators_guard before insert or update on public.roadside_operators for each row execute function private.roadside_operators_guard();

-- Operatore realmente prenotabile ora?
create or replace function private.roadside_operator_available(_profile uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.roadside_operators o where o.profile_id = _profile and o.status = 'attivo'
                   and (o.h24 or o.available_until > now()) and private.profile_is_public(o.profile_id));
$$;

create table public.roadside_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  user_vehicle_id    uuid references public.user_vehicles (id) on delete set null,
  vehicle_desc       text not null check (char_length(vehicle_desc) between 3 and 120),
  vehicle_type       text not null default 'auto' check (vehicle_type in ('auto', 'moto', 'furgone', 'suv', 'elettrica')),
  service            text not null check (service in ('carro_attrezzi', 'soccorso_meccanico', 'avviamento_batteria', 'cambio_gomma',
                                                       'rifornimento', 'apertura_veicolo', 'recupero_veicolo', 'trasporto_officina')),
  description        text not null check (char_length(description) between 10 and 2000),
  location_type      text not null check (location_type in ('strada', 'autostrada', 'parcheggio', 'garage', 'altro')),
  vehicle_drivable   boolean not null default false,
  people_safe        boolean not null,
  approx_lat         double precision check (approx_lat between -90 and 90),
  approx_lng         double precision check (approx_lng between -180 and 180),
  area_text          text not null check (char_length(area_text) between 2 and 120),
  destination_text   text check (char_length(destination_text) <= 200),
  destination_profile_id uuid references public.professional_profiles (id) on delete set null,
  photo_paths        text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  status             text not null default 'in_ricerca' check (status in ('in_ricerca', 'inviata', 'preventivo_ricevuto', 'accettata',
                       'operatore_in_viaggio', 'operatore_arrivato', 'intervento_in_corso', 'veicolo_caricato', 'in_trasporto',
                       'consegnato', 'completata', 'annullata', 'nessun_operatore')),
  operator_profile_id uuid references public.professional_profiles (id) on delete set null,
  accepted_quote_id  uuid,
  repair_request_id  uuid references public.repair_requests (id) on delete set null,
  cancel_reason      text check (char_length(cancel_reason) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index roadside_requests_user_idx on public.roadside_requests (user_id, created_at desc);
create index roadside_requests_operator_idx on public.roadside_requests (operator_profile_id, status);
create trigger roadside_requests_updated before update on public.roadside_requests for each row execute function private.set_updated_at();

-- Posizione esatta: separata, visibile solo al richiedente, all'operatore scelto e allo staff.
create table public.roadside_request_locations (
  request_id    uuid primary key references public.roadside_requests (id) on delete cascade,
  latitude      double precision check (latitude between -90 and 90),
  longitude     double precision check (longitude between -180 and 180),
  address_text  text check (char_length(address_text) <= 300),
  contact_phone text not null check (contact_phone ~ '^[0-9 +().-]{6,30}$'),
  plate         text check (plate ~ '^[A-Z0-9]{5,10}$'),
  consent_at    timestamptz not null default now()
);

create table public.roadside_targets (
  request_id      uuid not null references public.roadside_requests (id) on delete cascade,
  profile_id      uuid not null references public.professional_profiles (id) on delete cascade,
  status          text not null default 'inviata' check (status in ('inviata', 'preventivo', 'rifiutata', 'scelta', 'scartata')),
  conversation_id uuid references public.conversations (id) on delete set null,
  distance_km     numeric(6,1),
  created_at      timestamptz not null default now(),
  primary key (request_id, profile_id)
);
create index roadside_targets_profile_idx on public.roadside_targets (profile_id, created_at desc);

create table public.roadside_quotes (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.roadside_requests (id) on delete cascade,
  profile_id    uuid not null references public.professional_profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents between 0 and 10000000),
  eta_minutes   integer not null check (eta_minutes between 5 and 720),
  includes      text not null check (char_length(includes) between 5 and 1000),
  notes         text check (char_length(notes) <= 1000),
  valid_until   timestamptz not null,
  status        text not null default 'inviato' check (status in ('inviato', 'accettato', 'rifiutato', 'ritirato')),
  created_at    timestamptz not null default now()
);
create unique index roadside_quotes_active_uniq on public.roadside_quotes (request_id, profile_id) where status = 'inviato';
alter table public.roadside_requests add constraint roadside_requests_quote_fk foreign key (accepted_quote_id) references public.roadside_quotes (id) on delete set null;

create table public.roadside_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.roadside_requests (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  status      text not null,
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index roadside_events_request_idx on public.roadside_events (request_id, created_at);
create trigger roadside_events_immutable before update or delete on public.roadside_events for each row execute function private.audit_logs_immutable();

-- Posizione dell'operatore: una riga per intervento attivo, cancellata alla chiusura.
create table public.roadside_live_locations (
  request_id  uuid primary key references public.roadside_requests (id) on delete cascade,
  latitude    double precision not null check (latitude between -90 and 90),
  longitude   double precision not null check (longitude between -180 and 180),
  accuracy_m  integer check (accuracy_m between 0 and 100000),
  updated_at  timestamptz not null default now()
);

create or replace function private.roadside_event(_req uuid, _status text, _note text)
returns void language sql security definer set search_path = ''
as $$ insert into public.roadside_events (request_id, actor_id, status, note) values (_req, auth.uid(), _status, nullif(trim(_note), '')); $$;

create or replace function private.roadside_is_operator(_req uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.roadside_requests r where r.id = _req and private.owns_profile(r.operator_profile_id)); $$;

create or replace function private.roadside_is_target(_req uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.roadside_targets t where t.request_id = _req and private.owns_profile(t.profile_id) and t.status <> 'rifiutata'); $$;

-- Nuova richiesta di soccorso. La posizione esatta è facoltativa ma richiede il consenso esplicito.
create or replace function public.create_roadside_request(
  p_vehicle_desc text, p_vehicle_type text, p_service text, p_description text, p_location_type text,
  p_vehicle_drivable boolean, p_people_safe boolean, p_area_text text, p_contact_phone text,
  p_latitude double precision default null, p_longitude double precision default null, p_location_consent boolean default false,
  p_address_text text default null, p_destination_text text default null, p_user_vehicle_id uuid default null,
  p_photo_paths text[] default '{}', p_plate text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _p text;
begin
  foreach _p in array coalesce(p_photo_paths, '{}') loop
    if split_part(_p, '/', 1) <> auth.uid()::text or _p !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png|webp)$' then raise exception 'Foto non valida' using errcode = '42501'; end if;
  end loop;
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per richiedere assistenza' using errcode = '42501'; end if;
  if not coalesce(p_people_safe, false) then
    raise exception 'Se ci sono feriti o pericolo chiama subito il 112. Conferma di essere in un luogo sicuro per continuare.' using errcode = '22023';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'Posizione incompleta' using errcode = '22023'; end if;
  if p_latitude is not null and not coalesce(p_location_consent, false) then
    raise exception 'Serve il consenso per condividere la posizione' using errcode = '22023';
  end if;
  if p_user_vehicle_id is not null and not exists (select 1 from public.user_vehicles v where v.id = p_user_vehicle_id and v.owner_id = auth.uid() and v.deleted_at is null) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.roadside_requests r where r.user_id = auth.uid()
               and r.status not in ('completata', 'annullata', 'nessun_operatore', 'consegnato')) then
    raise exception 'Hai già una richiesta di soccorso aperta: la trovi in La mia area › Soccorso stradale' using errcode = '23505';
  end if;
  perform private.enforce_rate_limit('roadside', 5, interval '1 hour');
  insert into public.roadside_requests (user_id, user_vehicle_id, vehicle_desc, vehicle_type, service, description, location_type,
    vehicle_drivable, people_safe, approx_lat, approx_lng, area_text, destination_text, photo_paths)
  values (auth.uid(), p_user_vehicle_id, trim(p_vehicle_desc), coalesce(p_vehicle_type, 'auto'), p_service, trim(p_description), p_location_type,
    coalesce(p_vehicle_drivable, false), true, round(p_latitude::numeric, 2)::double precision, round(p_longitude::numeric, 2)::double precision,
    trim(p_area_text), nullif(trim(p_destination_text), ''), coalesce(p_photo_paths, '{}'))
  returning id into _id;
  insert into public.roadside_request_locations (request_id, latitude, longitude, address_text, contact_phone, plate)
  values (_id, p_latitude, p_longitude, nullif(trim(p_address_text), ''), trim(p_contact_phone), nullif(upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g')), ''));
  perform private.roadside_event(_id, 'in_ricerca', null);
  return _id;
end;
$$;

-- Operatori compatibili: attivi, disponibili ora, con il servizio e il tipo di veicolo, entro il proprio raggio.
create or replace function public.roadside_candidates(request_id uuid)
returns table (profile_id uuid, slug text, display_name text, city text, distance_km numeric, h24 boolean, available_until timestamptz,
               price_notes text, rating_avg numeric, review_count integer, verified boolean, already_sent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype;
begin
  select * into _r from public.roadside_requests r where r.id = roadside_candidates.request_id and r.user_id = auth.uid();
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  return query
  select pp.id, pp.slug, pp.display_name, pp.city,
         case when _r.approx_lat is not null and pp.latitude is not null
              then round(private.distance_km(_r.approx_lat, _r.approx_lng, pp.latitude, pp.longitude)::numeric, 1) end,
         o.h24, o.available_until, o.price_notes,
         (select round(avg(rv.rating)::numeric, 1) from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata'),
         (select count(*)::integer from public.reviews rv where rv.profile_id = pp.id and rv.status = 'pubblicata'),
         (pp.business_verified_at is not null), exists (select 1 from public.roadside_targets t where t.request_id = _r.id and t.profile_id = pp.id)
  from public.roadside_operators o
  join public.professional_profiles pp on pp.id = o.profile_id
  where private.roadside_operator_available(o.profile_id)
    and _r.service = any (o.services) and _r.vehicle_type = any (o.vehicle_types)
    and pp.user_id <> _r.user_id
    and (_r.approx_lat is null or pp.latitude is null
         or private.distance_km(_r.approx_lat, _r.approx_lng, pp.latitude, pp.longitude) <= coalesce(pp.service_radius_km, 30))
  order by 5 nulls last, pp.display_name
  limit 30;
end;
$$;

-- Invio agli operatori scelti (max 5): ognuno riceve una conversazione dedicata e la zona approssimata.
create or replace function public.dispatch_roadside_request(request_id uuid, profile_ids uuid[])
returns integer language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype; _p uuid; _n integer := 0; _conv uuid; _user uuid; _dist numeric;
begin
  select * into _r from public.roadside_requests r where r.id = dispatch_roadside_request.request_id and r.user_id = auth.uid() for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status not in ('in_ricerca', 'inviata', 'preventivo_ricevuto') then raise exception 'La richiesta non è più aperta' using errcode = '22023'; end if;
  if coalesce(cardinality(profile_ids), 0) = 0 then raise exception 'Scegli almeno un operatore' using errcode = '22023'; end if;
  if (select count(*) from public.roadside_targets t where t.request_id = _r.id) + cardinality(profile_ids) > 8 then
    raise exception 'Puoi contattare al massimo 8 operatori per richiesta' using errcode = '22023';
  end if;
  foreach _p in array profile_ids loop
    select c.distance_km into _dist from public.roadside_candidates(_r.id) c where c.profile_id = _p and not c.already_sent;
    if not found then raise exception 'Uno degli operatori scelti non è disponibile in questo momento' using errcode = '22023'; end if;
    select user_id into _user from public.professional_profiles where id = _p;
    _conv := private.open_service_conversation(_r.user_id, _user, _p, 'Soccorso stradale — ' || replace(_r.service, '_', ' ') || ' — ' || _r.area_text,
      'Richiesta di soccorso: ' || replace(_r.service, '_', ' ') || E'\nVeicolo: ' || _r.vehicle_desc || E'\nZona: ' || _r.area_text ||
      E'\nLuogo: ' || _r.location_type || case when _r.vehicle_drivable then ' · veicolo marciante' else ' · veicolo non marciante' end ||
      E'\n\n' || _r.description || E'\n\nL''indirizzo esatto viene condiviso solo con l''operatore scelto.');
    insert into public.roadside_targets (request_id, profile_id, conversation_id, distance_km) values (_r.id, _p, _conv, _dist);
    perform private.notify(_user, 'richieste', 'Richiesta di soccorso stradale', replace(_r.service, '_', ' ') || ' — ' || _r.area_text,
      '/dashboard/soccorso/' || _r.id, 'roadside:' || _r.id || ':' || _p);
    _n := _n + 1;
  end loop;
  if _r.status = 'in_ricerca' then
    update public.roadside_requests set status = 'inviata' where id = _r.id;
    perform private.roadside_event(_r.id, 'inviata', _n || ' operatori contattati');
  end if;
  return _n;
end;
$$;

-- Preventivo dell'operatore (prezzo e tempo di arrivo stimato dichiarati dall'operatore).
create or replace function public.send_roadside_quote(request_id uuid, amount_cents integer, eta_minutes integer, includes text,
  notes text default null, valid_minutes integer default 60)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype; _t public.roadside_targets%rowtype; _q uuid;
begin
  select * into _r from public.roadside_requests r where r.id = send_roadside_quote.request_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  select * into _t from public.roadside_targets t where t.request_id = _r.id and private.owns_profile(t.profile_id);
  if not found then raise exception 'Questa richiesta non ti è stata inviata' using errcode = '42501'; end if;
  if _r.status not in ('inviata', 'preventivo_ricevuto') or _t.status not in ('inviata', 'preventivo') then
    raise exception 'La richiesta non accetta più preventivi' using errcode = '22023';
  end if;
  update public.roadside_quotes q set status = 'ritirato' where q.request_id = _r.id and q.profile_id = _t.profile_id and q.status = 'inviato';
  insert into public.roadside_quotes (request_id, profile_id, amount_cents, eta_minutes, includes, notes, valid_until)
  values (_r.id, _t.profile_id, amount_cents, eta_minutes, trim(includes), nullif(trim(notes), ''), now() + make_interval(mins => least(greatest(coalesce(valid_minutes, 60), 10), 1440)))
  returning id into _q;
  update public.roadside_targets t set status = 'preventivo' where t.request_id = _r.id and t.profile_id = _t.profile_id;
  if _r.status = 'inviata' then update public.roadside_requests set status = 'preventivo_ricevuto' where id = _r.id; end if;
  perform private.roadside_event(_r.id, 'preventivo_ricevuto', (select display_name from public.professional_profiles where id = _t.profile_id));
  if _t.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body) values (_t.conversation_id, auth.uid(), 'sistema',
      'Preventivo: € ' || to_char(amount_cents / 100.0, 'FM999G990D00') || ' · arrivo stimato ' || eta_minutes || ' minuti' || E'\n' || trim(includes));
  end if;
  perform private.notify(_r.user_id, 'preventivi', 'Preventivo per il soccorso stradale', '€ ' || to_char(amount_cents / 100.0, 'FM999G990D00') || ' · arrivo stimato ' || eta_minutes || ' min',
    '/dashboard/soccorso/' || _r.id, 'roadside-quote:' || _q);
  return _q;
end;
$$;

create or replace function public.decline_roadside_request(request_id uuid, reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype; _p uuid;
begin
  select * into _r from public.roadside_requests r where r.id = decline_roadside_request.request_id for update;
  select t.profile_id into _p from public.roadside_targets t where t.request_id = _r.id and private.owns_profile(t.profile_id) and t.status in ('inviata', 'preventivo');
  if _p is null then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  update public.roadside_targets t set status = 'rifiutata' where t.request_id = _r.id and t.profile_id = _p;
  update public.roadside_quotes q set status = 'ritirato' where q.request_id = _r.id and q.profile_id = _p and q.status = 'inviato';
  perform private.notify(_r.user_id, 'richieste', 'Un operatore non è disponibile', coalesce(nullif(trim(reason), ''), 'Scegli un altro operatore'), '/dashboard/soccorso/' || _r.id, 'roadside-decline:' || _r.id || ':' || _p);
  if not exists (select 1 from public.roadside_targets t where t.request_id = _r.id and t.status in ('inviata', 'preventivo'))
     and _r.status in ('inviata', 'preventivo_ricevuto') then
    update public.roadside_requests set status = 'nessun_operatore' where id = _r.id;
    perform private.roadside_event(_r.id, 'nessun_operatore', 'Tutti gli operatori contattati hanno rifiutato');
  end if;
end;
$$;

-- Il cliente sceglie un preventivo: l'operatore riceve indirizzo e contatti, gli altri sono avvisati.
create or replace function public.accept_roadside_quote(quote_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _q public.roadside_quotes%rowtype; _r public.roadside_requests%rowtype; _t record;
begin
  select * into _q from public.roadside_quotes where id = quote_id for update;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  select * into _r from public.roadside_requests where id = _q.request_id and user_id = auth.uid() for update;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  if _q.status <> 'inviato' or _q.valid_until < now() then raise exception 'Il preventivo non è più valido: chiedine uno aggiornato' using errcode = '22023'; end if;
  if _r.status not in ('inviata', 'preventivo_ricevuto') then raise exception 'La richiesta non è più aperta' using errcode = '22023'; end if;
  update public.roadside_quotes set status = 'accettato' where id = _q.id;
  update public.roadside_quotes set status = 'rifiutato' where request_id = _r.id and id <> _q.id and status = 'inviato';
  update public.roadside_requests set status = 'accettata', operator_profile_id = _q.profile_id, accepted_quote_id = _q.id where id = _r.id;
  update public.roadside_targets set status = case when profile_id = _q.profile_id then 'scelta' else 'scartata' end
   where request_id = _r.id and status in ('inviata', 'preventivo');
  perform private.roadside_event(_r.id, 'accettata', null);
  for _t in select t.profile_id, pp.user_id, t.conversation_id from public.roadside_targets t join public.professional_profiles pp on pp.id = t.profile_id where t.request_id = _r.id loop
    if _t.profile_id = _q.profile_id then
      perform private.notify(_t.user_id, 'preventivi', 'Preventivo accettato: intervento confermato', _r.area_text, '/dashboard/soccorso/' || _r.id, 'roadside-ok:' || _r.id);
      if _t.conversation_id is not null then
        insert into public.messages (conversation_id, sender_id, kind, body) values (_t.conversation_id, auth.uid(), 'sistema',
          'Preventivo accettato. Indirizzo e telefono del cliente sono ora visibili nella richiesta. Aggiorna lo stato durante l''intervento.');
      end if;
    else
      perform private.notify(_t.user_id, 'richieste', 'Il cliente ha scelto un altro operatore', _r.area_text, '/dashboard/soccorso/' || _r.id, 'roadside-other:' || _r.id || ':' || _t.profile_id);
    end if;
  end loop;
end;
$$;

-- Avanzamento dell'intervento (Fase 29). Solo in avanti; il cliente può annullare.
create or replace function public.update_roadside_status(request_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype; _order text[] := array['accettata', 'operatore_in_viaggio', 'operatore_arrivato', 'intervento_in_corso',
  'veicolo_caricato', 'in_trasporto', 'consegnato', 'completata']; _owner boolean; _op boolean; _from integer; _to integer; _opuser uuid;
begin
  select * into _r from public.roadside_requests r where r.id = update_roadside_status.request_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  _owner := _r.user_id = auth.uid(); _op := private.owns_profile(_r.operator_profile_id);
  if not _owner and not _op then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status in ('completata', 'annullata', 'nessun_operatore') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  select user_id into _opuser from public.professional_profiles where id = _r.operator_profile_id;
  if new_status = 'annullata' then
    if _op and coalesce(trim(note), '') = '' then raise exception 'Indica il motivo dell''annullamento' using errcode = '22023'; end if;
    update public.roadside_requests set status = 'annullata', cancel_reason = nullif(trim(note), '') where id = _r.id;
    update public.roadside_quotes set status = 'ritirato' where request_id = _r.id and status = 'inviato';
    delete from public.roadside_live_locations where roadside_live_locations.request_id = _r.id;
    perform private.roadside_event(_r.id, 'annullata', note);
    if _owner and _opuser is not null then
      perform private.notify(_opuser, 'richieste', 'Soccorso annullato dal cliente', coalesce(nullif(trim(note), ''), _r.area_text), '/dashboard/soccorso/' || _r.id, 'roadside-cancel:' || _r.id);
    elsif _op then
      perform private.notify(_r.user_id, 'richieste', 'L''operatore ha annullato l''intervento', trim(note), '/dashboard/soccorso/' || _r.id, 'roadside-cancel:' || _r.id);
    end if;
    return;
  end if;
  _from := array_position(_order, _r.status); _to := array_position(_order, new_status);
  if _from is null or _to is null or _to <= _from then raise exception 'Passaggio di stato non valido' using errcode = '22023'; end if;
  -- Il cliente può solo confermare la conclusione; tutto il resto lo aggiorna l'operatore.
  if _owner and not _op and new_status <> 'completata' then raise exception 'Lo stato lo aggiorna l''operatore' using errcode = '42501'; end if;
  if _owner and not _op and _r.status not in ('operatore_arrivato', 'intervento_in_corso', 'veicolo_caricato', 'in_trasporto', 'consegnato') then
    raise exception 'Puoi confermare la conclusione dopo l''arrivo dell''operatore' using errcode = '22023';
  end if;
  update public.roadside_requests set status = new_status, completed_at = case when new_status = 'completata' then now() end where id = _r.id;
  if new_status in ('consegnato', 'completata') then delete from public.roadside_live_locations where roadside_live_locations.request_id = _r.id; end if;
  perform private.roadside_event(_r.id, new_status, note);
  if _op then
    perform private.notify(_r.user_id, 'richieste', 'Soccorso: ' || replace(new_status, '_', ' '), coalesce(nullif(trim(note), ''), _r.area_text),
      '/dashboard/soccorso/' || _r.id, 'roadside-st:' || _r.id || ':' || new_status);
  else
    perform private.notify(_opuser, 'richieste', 'Il cliente ha confermato la conclusione', _r.area_text, '/dashboard/soccorso/' || _r.id, 'roadside-done:' || _r.id);
  end if;
end;
$$;

-- Posizione dell'operatore: solo durante l'intervento attivo, solo dall'operatore scelto.
create or replace function public.share_operator_location(request_id uuid, latitude double precision, longitude double precision, accuracy_m integer default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype;
begin
  select * into _r from public.roadside_requests r where r.id = share_operator_location.request_id;
  if not found or not private.owns_profile(_r.operator_profile_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status not in ('accettata', 'operatore_in_viaggio', 'operatore_arrivato', 'intervento_in_corso', 'veicolo_caricato', 'in_trasporto') then
    raise exception 'La posizione si condivide solo durante l''intervento' using errcode = '22023';
  end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'Posizione non valida' using errcode = '22023'; end if;
  perform private.enforce_rate_limit('live_location', 30, interval '5 minutes');
  insert into public.roadside_live_locations (request_id, latitude, longitude, accuracy_m, updated_at)
  values (_r.id, latitude, longitude, accuracy_m, now())
  on conflict on constraint roadside_live_locations_pkey do update set latitude = excluded.latitude, longitude = excluded.longitude, accuracy_m = excluded.accuracy_m, updated_at = now();
end;
$$;

create or replace function public.stop_operator_location(request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.roadside_is_operator(stop_operator_location.request_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  delete from public.roadside_live_locations l where l.request_id = stop_operator_location.request_id;
end;
$$;

-- Collegamento con una richiesta di intervento in officina (Fase 18) creata dal cliente.
create or replace function public.link_roadside_repair(request_id uuid, repair_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.repair_requests rr where rr.id = repair_id and rr.owner_id = auth.uid()) then
    raise exception 'Richiesta di intervento non trovata' using errcode = 'P0002';
  end if;
  update public.roadside_requests r set repair_request_id = repair_id where r.id = link_roadside_repair.request_id and r.user_id = auth.uid();
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
end;
$$;

-- Staff: verifica degli operatori (soccorso e trasporto) e annullamenti.
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
  else
    perform set_config('ag24.trusted', 'off', true);
    raise exception 'Tipo non valido' using errcode = '22023';
  end if;
  perform set_config('ag24.trusted', 'off', true);
  if _n = 0 then raise exception 'Operatore non trovato' using errcode = 'P0002'; end if;
  select user_id into _user from public.professional_profiles where id = admin_set_service_operator.profile_id;
  perform private.notify(_user, 'amministrazione', case new_status when 'attivo' then 'Servizio di ' || kind || ' attivato' else 'Servizio di ' || kind || ': ' || new_status end,
    coalesce(nullif(trim(note), ''), 'Verifica completata dallo staff'), case kind when 'soccorso' then '/dashboard/soccorso/operatore' else '/dashboard/trasporti/operatore' end,
    'svc-op:' || kind || ':' || admin_set_service_operator.profile_id || ':' || new_status);
  perform private.log_admin_action('service_operator.' || new_status, case kind when 'soccorso' then 'roadside_operators' else 'transport_operators' end,
    admin_set_service_operator.profile_id::text, jsonb_build_object('note', note));
end;
$$;

create or replace function public.admin_cancel_roadside(request_id uuid, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.roadside_requests%rowtype;
begin
  if not private.has_permission('services.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if coalesce(trim(reason), '') = '' then raise exception 'Indica il motivo' using errcode = '22023'; end if;
  update public.roadside_requests r set status = 'annullata', cancel_reason = trim(reason)
   where r.id = admin_cancel_roadside.request_id and r.status not in ('completata', 'annullata') returning * into _r;
  if not found then raise exception 'Richiesta non trovata o già chiusa' using errcode = 'P0002'; end if;
  delete from public.roadside_live_locations l where l.request_id = _r.id;
  insert into public.roadside_events (request_id, actor_id, status, note) values (_r.id, auth.uid(), 'annullata', 'Staff: ' || trim(reason));
  perform private.notify(_r.user_id, 'amministrazione', 'Richiesta di soccorso annullata dallo staff', trim(reason), '/dashboard/soccorso/' || _r.id, 'roadside-admin:' || _r.id);
  perform private.log_admin_action('roadside.cancel', 'roadside_requests', _r.id::text, jsonb_build_object('reason', reason));
end;
$$;

-- Disponibilità scadute e posizioni dimenticate: pulizia periodica.
create or replace function private.roadside_housekeeping()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.roadside_live_locations l using public.roadside_requests r
   where r.id = l.request_id and (r.status in ('consegnato', 'completata', 'annullata', 'nessun_operatore') or l.updated_at < now() - interval '6 hours');
  update public.roadside_quotes set status = 'ritirato' where status = 'inviato' and valid_until < now() - interval '1 day';
  update public.roadside_requests r set status = 'nessun_operatore'
   where r.status in ('in_ricerca', 'inviata') and r.created_at < now() - interval '24 hours';
end;
$$;

-- RLS soccorso -----------------------------------------------------------
alter table public.roadside_operators enable row level security;
alter table public.roadside_requests enable row level security;
alter table public.roadside_request_locations enable row level security;
alter table public.roadside_targets enable row level security;
alter table public.roadside_quotes enable row level security;
alter table public.roadside_events enable row level security;
alter table public.roadside_live_locations enable row level security;
revoke all on public.roadside_operators, public.roadside_requests, public.roadside_request_locations, public.roadside_targets,
  public.roadside_quotes, public.roadside_events, public.roadside_live_locations from anon, authenticated;
grant all on public.roadside_operators, public.roadside_requests, public.roadside_request_locations, public.roadside_targets,
  public.roadside_quotes, public.roadside_events, public.roadside_live_locations to service_role;

grant select on public.roadside_operators to anon, authenticated;
grant insert (profile_id, services, vehicle_types, h24, available_until, hours_text, price_notes),
      update (services, vehicle_types, h24, available_until, hours_text, price_notes) on public.roadside_operators to authenticated;
create policy "roadside_operators: pubblici se attivi" on public.roadside_operators for select to anon, authenticated
  using (status = 'attivo' and private.profile_is_public(profile_id));
create policy "roadside_operators: proprietario" on public.roadside_operators for select to authenticated using (private.owns_profile(profile_id));
create policy "roadside_operators: staff" on public.roadside_operators for select to authenticated using (private.has_permission('services.manage'));
create policy "roadside_operators: crea proprio" on public.roadside_operators for insert to authenticated with check (private.owns_profile(profile_id));
create policy "roadside_operators: modifica proprio" on public.roadside_operators for update to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

grant select on public.roadside_requests, public.roadside_targets, public.roadside_quotes, public.roadside_events, public.roadside_request_locations, public.roadside_live_locations to authenticated;
create policy "roadside_requests: lettura" on public.roadside_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.roadside_is_target(id) or private.owns_profile(operator_profile_id) or private.has_permission('services.manage'));
create policy "roadside_locations: cliente, operatore scelto, staff" on public.roadside_request_locations for select to authenticated
  using (exists (select 1 from public.roadside_requests r where r.id = request_id
                   and (r.user_id = (select auth.uid()) or (private.owns_profile(r.operator_profile_id) and r.status not in ('annullata', 'completata', 'nessun_operatore'))))
         or private.has_permission('services.manage'));
create policy "roadside_targets: lettura" on public.roadside_targets for select to authenticated
  using (private.owns_profile(profile_id) or exists (select 1 from public.roadside_requests r where r.id = request_id and r.user_id = (select auth.uid()))
         or private.has_permission('services.manage'));
create policy "roadside_quotes: lettura" on public.roadside_quotes for select to authenticated
  using (private.owns_profile(profile_id) or exists (select 1 from public.roadside_requests r where r.id = request_id and r.user_id = (select auth.uid()))
         or private.has_permission('services.manage'));
create policy "roadside_events: lettura" on public.roadside_events for select to authenticated
  using (exists (select 1 from public.roadside_requests r where r.id = request_id and (r.user_id = (select auth.uid()) or private.owns_profile(r.operator_profile_id)))
         or private.has_permission('services.manage'));
create policy "roadside_live: cliente e operatore" on public.roadside_live_locations for select to authenticated
  using (exists (select 1 from public.roadside_requests r where r.id = request_id and (r.user_id = (select auth.uid()) or private.owns_profile(r.operator_profile_id))));

revoke all on function public.create_roadside_request(text, text, text, text, text, boolean, boolean, text, text, double precision, double precision, boolean, text, text, uuid, text[], text) from public, anon;
grant execute on function public.create_roadside_request(text, text, text, text, text, boolean, boolean, text, text, double precision, double precision, boolean, text, text, uuid, text[], text) to authenticated;
revoke all on function public.roadside_candidates(uuid) from public, anon;
grant execute on function public.roadside_candidates(uuid) to authenticated;
revoke all on function public.dispatch_roadside_request(uuid, uuid[]) from public, anon;
grant execute on function public.dispatch_roadside_request(uuid, uuid[]) to authenticated;
revoke all on function public.send_roadside_quote(uuid, integer, integer, text, text, integer) from public, anon;
grant execute on function public.send_roadside_quote(uuid, integer, integer, text, text, integer) to authenticated;
revoke all on function public.decline_roadside_request(uuid, text) from public, anon;
grant execute on function public.decline_roadside_request(uuid, text) to authenticated;
revoke all on function public.accept_roadside_quote(uuid) from public, anon;
grant execute on function public.accept_roadside_quote(uuid) to authenticated;
revoke all on function public.update_roadside_status(uuid, text, text) from public, anon;
grant execute on function public.update_roadside_status(uuid, text, text) to authenticated;
revoke all on function public.share_operator_location(uuid, double precision, double precision, integer) from public, anon;
grant execute on function public.share_operator_location(uuid, double precision, double precision, integer) to authenticated;
revoke all on function public.stop_operator_location(uuid) from public, anon;
grant execute on function public.stop_operator_location(uuid) to authenticated;
revoke all on function public.link_roadside_repair(uuid, uuid) from public, anon;
grant execute on function public.link_roadside_repair(uuid, uuid) to authenticated;
revoke all on function public.admin_cancel_roadside(uuid, text) from public, anon;
grant execute on function public.admin_cancel_roadside(uuid, text) to authenticated;

-- Elenco pubblico degli operatori attivi (pagina informativa, senza dati personali).
create or replace function public.public_roadside_operators(p_city text default null, p_service text default null)
returns table (profile_id uuid, slug text, display_name text, city text, services text[], h24 boolean, available_now boolean, hours_text text, verified boolean)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.slug, pp.display_name, pp.city, o.services, o.h24, (o.h24 or o.available_until > now()), o.hours_text, pp.business_verified_at is not null
  from public.roadside_operators o join public.professional_profiles pp on pp.id = o.profile_id
  where o.status = 'attivo' and private.profile_is_public(o.profile_id)
    and (p_city is null or lower(pp.city) = lower(trim(p_city)))
    and (p_service is null or p_service = any (o.services))
  order by (o.h24 or o.available_until > now()) desc, pp.display_name
  limit 100;
$$;
grant execute on function public.public_roadside_operators(text, text) to anon, authenticated;

-- =====================================================================
-- FASE 28 — TRASPORTO AUTO
-- =====================================================================
create table public.transport_operators (
  profile_id         uuid primary key references public.professional_profiles (id) on delete cascade,
  services           text[] not null check (cardinality(services) between 1 and 6 and services <@ array['carro_attrezzi', 'bisarca', 'pianale_chiuso', 'con_autista']::text[]),
  regions            text[] not null check (cardinality(regions) between 1 and 21),
  max_distance_km    integer check (max_distance_km between 10 and 3000),
  insurance_declared boolean not null default false,
  insurance_notes    text check (char_length(insurance_notes) <= 1000),
  price_notes        text check (char_length(price_notes) <= 1000),
  status             text not null default 'in_revisione' check (status in ('in_revisione', 'attivo', 'sospeso', 'rifiutato')),
  admin_note         text check (char_length(admin_note) <= 500),
  verified_at        timestamptz,
  verified_by        uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger transport_operators_updated before update on public.transport_operators for each row execute function private.set_updated_at();

create or replace function private.transport_operators_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _type public.app_role;
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  select professional_type into _type from public.professional_profiles where id = new.profile_id;
  if _type is null or _type::text not in ('trasportatore', 'soccorritore', 'venditore_auto') then
    raise exception 'Il trasporto auto è disponibile per trasportatori, soccorritori e concessionari' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.status := 'in_revisione'; new.verified_at := null; new.verified_by := null; new.admin_note := null;
    perform private.notify_staff('services.manage', 'Nuovo trasportatore da verificare',
      (select display_name from public.professional_profiles where id = new.profile_id), '/admin/servizi?tab=trasporti', 'transport-op:' || new.profile_id);
  else
    new.status := old.status; new.verified_at := old.verified_at; new.verified_by := old.verified_by; new.admin_note := old.admin_note;
    -- Le dichiarazioni assicurative modificate tornano in verifica.
    if new.insurance_declared is distinct from old.insurance_declared or new.insurance_notes is distinct from old.insurance_notes then
      if old.status = 'attivo' then
        perform private.notify_staff('services.manage', 'Trasportatore: copertura assicurativa modificata',
          (select display_name from public.professional_profiles where id = new.profile_id), '/admin/servizi?tab=trasporti', 'transport-ins:' || new.profile_id || ':' || now()::date);
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger transport_operators_guard before insert or update on public.transport_operators for each row execute function private.transport_operators_guard();

create or replace function private.is_active_transporter()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.transport_operators o join public.professional_profiles pp on pp.id = o.profile_id
                 where pp.user_id = (select auth.uid()) and o.status = 'attivo' and private.profile_is_public(o.profile_id));
$$;

create table public.transport_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  listing_id          uuid references public.vehicle_listings (id) on delete set null,
  user_vehicle_id     uuid references public.user_vehicles (id) on delete set null,
  vehicle_desc        text not null check (char_length(vehicle_desc) between 3 and 120),
  vehicle_drivable    boolean not null default true,
  service             text not null check (service in ('carro_attrezzi', 'bisarca', 'pianale_chiuso', 'con_autista', 'indifferente')),
  pickup_city         text not null check (char_length(pickup_city) between 2 and 80),
  pickup_postal_code  text check (pickup_postal_code ~ '^[0-9]{5}$'),
  pickup_region       text not null check (char_length(pickup_region) between 3 and 40),
  delivery_city       text not null check (char_length(delivery_city) between 2 and 80),
  delivery_postal_code text check (delivery_postal_code ~ '^[0-9]{5}$'),
  delivery_region     text not null check (char_length(delivery_region) between 3 and 40),
  date_from           date not null,
  date_to             date not null,
  urgency             text not null default 'programmato' check (urgency in ('programmato', 'urgente')),
  vehicle_category    text not null default 'auto' check (vehicle_category in ('city_car', 'auto', 'suv', 'furgone', 'moto', 'epoca')),
  vehicle_condition   text check (char_length(vehicle_condition) <= 500),
  photo_paths         text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  notes               text check (char_length(notes) <= 2000),
  status              text not null default 'aperta' check (status in ('aperta', 'preventivi_ricevuti', 'assegnata', 'ritiro_programmato', 'ritirato',
                        'in_transito', 'consegnato', 'completata', 'annullata', 'contestata')),
  operator_profile_id uuid references public.professional_profiles (id) on delete set null,
  accepted_quote_id   uuid,
  cancel_reason       text check (char_length(cancel_reason) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz,
  check (date_to >= date_from)
);
create index transport_requests_user_idx on public.transport_requests (user_id, created_at desc);
create index transport_requests_open_idx on public.transport_requests (status, pickup_region) where status in ('aperta', 'preventivi_ricevuti');
create trigger transport_requests_updated before update on public.transport_requests for each row execute function private.set_updated_at();

create or replace function private.transport_requests_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.user_id := auth.uid(); new.status := 'aperta'; new.operator_profile_id := null; new.accepted_quote_id := null; new.completed_at := null;
  if new.date_from < current_date then raise exception 'La data di ritiro non può essere nel passato' using errcode = '22023'; end if;
  if new.date_to > current_date + 180 then raise exception 'Indica un periodo entro 6 mesi' using errcode = '22023'; end if;
  if new.listing_id is not null and not exists (select 1 from public.vehicle_listings l where l.id = new.listing_id and (l.status = 'pubblicato' or l.owner_id = auth.uid())) then
    raise exception 'Annuncio non disponibile' using errcode = 'P0002';
  end if;
  if new.user_vehicle_id is not null and not exists (select 1 from public.user_vehicles v where v.id = new.user_vehicle_id and v.owner_id = auth.uid() and v.deleted_at is null) then
    raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where split_part(p, '/', 1) <> auth.uid()::text or p !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png|webp)$') then
    raise exception 'Foto non valida' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('transport_request', 5, interval '1 day');
  return new;
end;
$$;
create trigger transport_requests_before_insert before insert on public.transport_requests for each row execute function private.transport_requests_before_insert();

-- Il cliente modifica solo dati descrittivi finché non ha scelto un trasportatore; lo stato passa dalle funzioni.
create or replace function private.transport_requests_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if old.status not in ('aperta', 'preventivi_ricevuti') then raise exception 'La richiesta non è più modificabile' using errcode = '22023'; end if;
  new.user_id := old.user_id; new.status := old.status; new.operator_profile_id := old.operator_profile_id;
  new.accepted_quote_id := old.accepted_quote_id; new.completed_at := old.completed_at; new.listing_id := old.listing_id;
  return new;
end;
$$;
create trigger transport_requests_before_update before update on public.transport_requests for each row execute function private.transport_requests_before_update();

-- Indirizzi e contatti: solo cliente, trasportatore scelto e staff.
create table public.transport_request_addresses (
  request_id       uuid primary key references public.transport_requests (id) on delete cascade,
  pickup_address   text not null check (char_length(pickup_address) between 5 and 300),
  delivery_address text not null check (char_length(delivery_address) between 5 and 300),
  contact_name     text not null check (char_length(contact_name) between 2 and 120),
  contact_phone    text not null check (contact_phone ~ '^[0-9 +().-]{6,30}$')
);

create table public.transport_quotes (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.transport_requests (id) on delete cascade,
  profile_id         uuid not null references public.professional_profiles (id) on delete cascade,
  amount_cents       integer not null check (amount_cents between 1000 and 100000000),
  pickup_date        date not null,
  delivery_date      date not null,
  includes_insurance boolean not null default false,
  notes              text check (char_length(notes) <= 2000),
  valid_until        date not null,
  status             text not null default 'inviato' check (status in ('inviato', 'accettato', 'rifiutato', 'ritirato')),
  conversation_id    uuid references public.conversations (id) on delete set null,
  created_at         timestamptz not null default now(),
  check (delivery_date >= pickup_date)
);
create unique index transport_quotes_active_uniq on public.transport_quotes (request_id, profile_id) where status = 'inviato';
alter table public.transport_requests add constraint transport_requests_quote_fk foreign key (accepted_quote_id) references public.transport_quotes (id) on delete set null;

create table public.transport_reports (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.transport_requests (id) on delete cascade,
  kind          text not null check (kind in ('ritiro', 'consegna')),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  odometer_km   integer check (odometer_km between 0 and 2000000),
  fuel_level    text check (fuel_level in ('riserva', '1/4', '1/2', '3/4', 'pieno', 'n/d')),
  damages       text check (char_length(damages) <= 2000),
  notes         text check (char_length(notes) <= 2000),
  photo_paths   text[] not null default '{}' check (cardinality(photo_paths) <= 12),
  accessories   text check (char_length(accessories) <= 500),
  counterpart_name text check (char_length(counterpart_name) <= 120),
  created_at    timestamptz not null default now(),
  unique (request_id, kind)
);
create trigger transport_reports_immutable before update or delete on public.transport_reports for each row execute function private.audit_logs_immutable();

create table public.transport_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.transport_requests (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  status      text not null,
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index transport_events_request_idx on public.transport_events (request_id, created_at);
create trigger transport_events_immutable before update or delete on public.transport_events for each row execute function private.audit_logs_immutable();

create or replace function private.transport_event(_req uuid, _status text, _note text)
returns void language sql security definer set search_path = ''
as $$ insert into public.transport_events (request_id, actor_id, status, note) values (_req, auth.uid(), _status, nullif(trim(_note), '')); $$;

create or replace function private.transport_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.transport_events (request_id, actor_id, status) values (new.id, new.user_id, 'aperta');
  return null;
end;
$$;
create trigger transport_requests_after_insert after insert on public.transport_requests for each row execute function private.transport_after_insert();

create or replace function public.send_transport_quote(request_id uuid, amount_cents integer, pickup_date date, delivery_date date,
  includes_insurance boolean default false, notes text default null, valid_days integer default 7)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.transport_requests%rowtype; _p uuid; _puser uuid; _conv uuid; _q uuid; _o public.transport_operators%rowtype;
begin
  select * into _r from public.transport_requests t where t.id = send_transport_quote.request_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  select o.* into _o from public.transport_operators o join public.professional_profiles pp on pp.id = o.profile_id
   where pp.user_id = auth.uid() and o.status = 'attivo' and private.profile_is_public(o.profile_id) limit 1;
  if not found then raise exception 'Il tuo servizio di trasporto non è ancora attivo' using errcode = '42501'; end if;
  _p := _o.profile_id; _puser := auth.uid();
  if _r.user_id = _puser then raise exception 'Non puoi inviare un preventivo a te stesso' using errcode = '22023'; end if;
  if _r.status not in ('aperta', 'preventivi_ricevuti') then raise exception 'La richiesta non accetta più preventivi' using errcode = '22023'; end if;
  if not (_r.pickup_region = any (_o.regions) or _r.delivery_region = any (_o.regions)) then
    raise exception 'La richiesta è fuori dalle tue zone di servizio' using errcode = '22023';
  end if;
  if pickup_date < current_date then raise exception 'Data di ritiro non valida' using errcode = '22023'; end if;
  if send_transport_quote.includes_insurance and not _o.insurance_declared then
    raise exception 'Per indicare la copertura assicurativa dichiarala prima nel tuo profilo trasportatore' using errcode = '22023';
  end if;
  select q.conversation_id into _conv from public.transport_quotes q where q.request_id = _r.id and q.profile_id = _p and q.conversation_id is not null limit 1;
  if _conv is null then
    _conv := private.open_service_conversation(_r.user_id, _puser, _p, 'Trasporto ' || _r.pickup_city || ' → ' || _r.delivery_city,
      'Richiesta di trasporto: ' || _r.vehicle_desc || ' da ' || _r.pickup_city || ' a ' || _r.delivery_city);
  end if;
  update public.transport_quotes q set status = 'ritirato' where q.request_id = _r.id and q.profile_id = _p and q.status = 'inviato';
  insert into public.transport_quotes (request_id, profile_id, amount_cents, pickup_date, delivery_date, includes_insurance, notes, valid_until, conversation_id)
  values (_r.id, _p, amount_cents, pickup_date, delivery_date, coalesce(includes_insurance, false), nullif(trim(notes), ''), current_date + least(greatest(coalesce(valid_days, 7), 1), 30), _conv)
  returning id into _q;
  insert into public.messages (conversation_id, sender_id, kind, body) values (_conv, _puser, 'sistema',
    'Preventivo di trasporto: € ' || to_char(amount_cents / 100.0, 'FM999G990D00') || ' · ritiro ' || to_char(pickup_date, 'DD/MM') || ' · consegna ' || to_char(delivery_date, 'DD/MM'));
  perform set_config('ag24.trusted', 'on', true);
  if _r.status = 'aperta' then update public.transport_requests set status = 'preventivi_ricevuti' where id = _r.id; end if;
  perform set_config('ag24.trusted', 'off', true);
  perform private.transport_event(_r.id, 'preventivo_ricevuto', (select display_name from public.professional_profiles where id = _p));
  perform private.notify(_r.user_id, 'preventivi', 'Nuovo preventivo di trasporto', '€ ' || to_char(amount_cents / 100.0, 'FM999G990D00') || ' · ' || _r.pickup_city || ' → ' || _r.delivery_city,
    '/dashboard/trasporti/' || _r.id, 'transport-quote:' || _q);
  return _q;
end;
$$;

create or replace function public.accept_transport_quote(quote_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _q public.transport_quotes%rowtype; _r public.transport_requests%rowtype; _o record;
begin
  select * into _q from public.transport_quotes where id = quote_id for update;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  select * into _r from public.transport_requests where id = _q.request_id and user_id = auth.uid() for update;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  if _q.status <> 'inviato' or _q.valid_until < current_date then raise exception 'Il preventivo non è più valido' using errcode = '22023'; end if;
  if _r.status not in ('aperta', 'preventivi_ricevuti') then raise exception 'La richiesta non è più aperta' using errcode = '22023'; end if;
  if not exists (select 1 from public.transport_request_addresses a where a.request_id = _r.id) then
    raise exception 'Indica gli indirizzi di ritiro e consegna prima di accettare' using errcode = '22023';
  end if;
  update public.transport_quotes set status = 'accettato' where id = _q.id;
  perform set_config('ag24.trusted', 'on', true);
  update public.transport_requests set status = 'assegnata', operator_profile_id = _q.profile_id, accepted_quote_id = _q.id where id = _r.id;
  perform set_config('ag24.trusted', 'off', true);
  perform private.transport_event(_r.id, 'assegnata', null);
  for _o in select q.id, q.profile_id, pp.user_id from public.transport_quotes q join public.professional_profiles pp on pp.id = q.profile_id
            where q.request_id = _r.id and q.status = 'inviato' loop
    update public.transport_quotes set status = 'rifiutato' where id = _o.id;
    perform private.notify(_o.user_id, 'preventivi', 'Il cliente ha scelto un altro trasportatore', _r.pickup_city || ' → ' || _r.delivery_city, '/dashboard/trasporti/operatore', 'transport-other:' || _o.id);
  end loop;
  perform private.notify((select user_id from public.professional_profiles where id = _q.profile_id), 'preventivi', 'Preventivo di trasporto accettato',
    _r.pickup_city || ' → ' || _r.delivery_city || ': indirizzi e contatti ora visibili', '/dashboard/trasporti/' || _r.id, 'transport-ok:' || _r.id);
  if _q.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body) values (_q.conversation_id, auth.uid(), 'sistema',
      'Preventivo accettato. Il pagamento si concorda direttamente con il trasportatore: AutoGarage24 non incassa né trattiene somme.');
  end if;
end;
$$;

-- Stati operativi aggiornati dal trasportatore; il cliente conferma la consegna o la contesta.
create or replace function public.update_transport_status(request_id uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.transport_requests%rowtype; _owner boolean; _op boolean; _order text[] := array['assegnata', 'ritiro_programmato', 'ritirato', 'in_transito', 'consegnato', 'completata'];
        _from integer; _to integer; _opuser uuid;
begin
  select * into _r from public.transport_requests t where t.id = update_transport_status.request_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  _owner := _r.user_id = auth.uid(); _op := private.owns_profile(_r.operator_profile_id);
  if not _owner and not _op then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.status in ('completata', 'annullata') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  select user_id into _opuser from public.professional_profiles where id = _r.operator_profile_id;
  perform set_config('ag24.trusted', 'on', true);
  if new_status = 'annullata' then
    if _r.status in ('ritirato', 'in_transito', 'consegnato', 'contestata') then
      perform set_config('ag24.trusted', 'off', true);
      raise exception 'Il veicolo è già stato ritirato: contatta lo staff se c''è un problema' using errcode = '22023';
    end if;
    if _op and coalesce(trim(note), '') = '' then perform set_config('ag24.trusted', 'off', true); raise exception 'Indica il motivo' using errcode = '22023'; end if;
    update public.transport_requests set status = 'annullata', cancel_reason = nullif(trim(note), '') where id = _r.id;
    update public.transport_quotes set status = 'ritirato' where transport_quotes.request_id = _r.id and status = 'inviato';
  elsif new_status = 'contestata' then
    if not _owner or _r.status <> 'consegnato' then perform set_config('ag24.trusted', 'off', true); raise exception 'Puoi segnalare un problema dopo la consegna' using errcode = '22023'; end if;
    if coalesce(trim(note), '') = '' then perform set_config('ag24.trusted', 'off', true); raise exception 'Descrivi il problema' using errcode = '22023'; end if;
    update public.transport_requests set status = 'contestata' where id = _r.id;
    perform private.notify_staff('services.manage', 'Trasporto contestato dal cliente', left(trim(note), 140), '/admin/servizi?tab=trasporti', 'transport-dispute:' || _r.id);
  else
    _from := array_position(_order, case when _r.status = 'contestata' then 'consegnato' else _r.status end); _to := array_position(_order, new_status);
    if _from is null or _to is null or _to <= _from then perform set_config('ag24.trusted', 'off', true); raise exception 'Passaggio di stato non valido' using errcode = '22023'; end if;
    if new_status = 'completata' then
      if not _owner or _r.status not in ('consegnato', 'contestata') then perform set_config('ag24.trusted', 'off', true); raise exception 'La conclusione la conferma il cliente dopo la consegna' using errcode = '42501'; end if;
    elsif not _op then
      perform set_config('ag24.trusted', 'off', true); raise exception 'Lo stato lo aggiorna il trasportatore' using errcode = '42501';
    end if;
    if new_status in ('ritirato', 'consegnato') and not exists (select 1 from public.transport_reports rp where rp.request_id = _r.id and rp.kind = case new_status when 'ritirato' then 'ritiro' else 'consegna' end) then
      perform set_config('ag24.trusted', 'off', true);
      raise exception 'Compila prima il verbale di %', case new_status when 'ritirato' then 'ritiro' else 'consegna' end using errcode = '22023';
    end if;
    update public.transport_requests set status = new_status, completed_at = case when new_status = 'completata' then now() end where id = _r.id;
  end if;
  perform set_config('ag24.trusted', 'off', true);
  perform private.transport_event(_r.id, new_status, note);
  if _op then
    perform private.notify(_r.user_id, 'richieste', 'Trasporto: ' || replace(new_status, '_', ' '), _r.pickup_city || ' → ' || _r.delivery_city, '/dashboard/trasporti/' || _r.id, 'transport-st:' || _r.id || ':' || new_status);
  elsif _opuser is not null then
    perform private.notify(_opuser, 'richieste', 'Trasporto: ' || replace(new_status, '_', ' '), coalesce(nullif(trim(note), ''), _r.pickup_city || ' → ' || _r.delivery_city), '/dashboard/trasporti/' || _r.id, 'transport-st:' || _r.id || ':' || new_status);
  end if;
end;
$$;

-- Verbale di ritiro / consegna con foto (bucket privato transport-reports).
create or replace function public.add_transport_report(request_id uuid, kind text, odometer_km integer default null, fuel_level text default null,
  damages text default null, notes text default null, photo_paths text[] default '{}', counterpart_name text default null, accessories text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _r public.transport_requests%rowtype; _id uuid; _p text;
begin
  select * into _r from public.transport_requests t where t.id = add_transport_report.request_id;
  if not found or not private.owns_profile(_r.operator_profile_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if kind = 'ritiro' and _r.status not in ('assegnata', 'ritiro_programmato') then raise exception 'Il verbale di ritiro si compila al momento del ritiro' using errcode = '22023'; end if;
  if kind = 'consegna' and _r.status not in ('ritirato', 'in_transito') then raise exception 'Il verbale di consegna si compila alla consegna' using errcode = '22023'; end if;
  foreach _p in array coalesce(photo_paths, '{}') loop
    if split_part(_p, '/', 1) <> auth.uid()::text or _p !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png|webp)$' then raise exception 'Foto non valida' using errcode = '42501'; end if;
  end loop;
  insert into public.transport_reports (request_id, kind, odometer_km, fuel_level, damages, notes, photo_paths, counterpart_name, accessories)
  values (_r.id, kind, odometer_km, fuel_level, nullif(trim(damages), ''), nullif(trim(notes), ''), coalesce(photo_paths, '{}'), nullif(trim(counterpart_name), ''), nullif(trim(accessories), ''))
  returning id into _id;
  perform public.update_transport_status(_r.id, case kind when 'ritiro' then 'ritirato' else 'consegnato' end, 'Verbale di ' || kind || ' compilato');
  return _id;
end;
$$;

create or replace function public.admin_cancel_transport(request_id uuid, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.transport_requests%rowtype;
begin
  if not private.has_permission('services.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if coalesce(trim(reason), '') = '' then raise exception 'Indica il motivo' using errcode = '22023'; end if;
  perform set_config('ag24.trusted', 'on', true);
  update public.transport_requests t set status = 'annullata', cancel_reason = trim(reason)
   where t.id = admin_cancel_transport.request_id and t.status not in ('completata', 'annullata') returning * into _r;
  perform set_config('ag24.trusted', 'off', true);
  if _r.id is null then raise exception 'Richiesta non trovata o già chiusa' using errcode = 'P0002'; end if;
  insert into public.transport_events (request_id, actor_id, status, note) values (_r.id, auth.uid(), 'annullata', 'Staff: ' || trim(reason));
  perform private.notify(_r.user_id, 'amministrazione', 'Trasporto annullato dallo staff', trim(reason), '/dashboard/trasporti/' || _r.id, 'transport-admin:' || _r.id);
  perform private.log_admin_action('transport.cancel', 'transport_requests', _r.id::text, jsonb_build_object('reason', reason));
end;
$$;

-- RLS trasporti ----------------------------------------------------------
alter table public.transport_operators enable row level security;
alter table public.transport_requests enable row level security;
alter table public.transport_request_addresses enable row level security;
alter table public.transport_quotes enable row level security;
alter table public.transport_reports enable row level security;
alter table public.transport_events enable row level security;
revoke all on public.transport_operators, public.transport_requests, public.transport_request_addresses, public.transport_quotes,
  public.transport_reports, public.transport_events from anon, authenticated;
grant all on public.transport_operators, public.transport_requests, public.transport_request_addresses, public.transport_quotes,
  public.transport_reports, public.transport_events to service_role;

grant select on public.transport_operators to anon, authenticated;
grant insert (profile_id, services, regions, max_distance_km, insurance_declared, insurance_notes, price_notes),
      update (services, regions, max_distance_km, insurance_declared, insurance_notes, price_notes) on public.transport_operators to authenticated;
create policy "transport_operators: pubblici se attivi" on public.transport_operators for select to anon, authenticated
  using (status = 'attivo' and private.profile_is_public(profile_id));
create policy "transport_operators: proprietario" on public.transport_operators for select to authenticated using (private.owns_profile(profile_id));
create policy "transport_operators: staff" on public.transport_operators for select to authenticated using (private.has_permission('services.manage'));
create policy "transport_operators: crea proprio" on public.transport_operators for insert to authenticated with check (private.owns_profile(profile_id));
create policy "transport_operators: modifica proprio" on public.transport_operators for update to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

grant select on public.transport_requests, public.transport_request_addresses, public.transport_quotes, public.transport_reports, public.transport_events to authenticated;
grant insert (listing_id, user_vehicle_id, vehicle_desc, vehicle_drivable, service, pickup_city, pickup_postal_code, pickup_region, delivery_city,
              delivery_postal_code, delivery_region, date_from, date_to, urgency, vehicle_category, vehicle_condition, photo_paths, notes) on public.transport_requests to authenticated;
grant update (vehicle_desc, vehicle_drivable, service, date_from, date_to, notes) on public.transport_requests to authenticated;
create policy "transport_requests: cliente" on public.transport_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "transport_requests: trasportatori attivi (richieste aperte)" on public.transport_requests for select to authenticated
  using (status in ('aperta', 'preventivi_ricevuti') and private.is_active_transporter());
create policy "transport_requests: trasportatore scelto" on public.transport_requests for select to authenticated using (private.owns_profile(operator_profile_id));
create policy "transport_requests: staff" on public.transport_requests for select to authenticated using (private.has_permission('services.manage'));
create policy "transport_requests: crea" on public.transport_requests for insert to authenticated with check (user_id = (select auth.uid()) and private.is_active_user());
create policy "transport_requests: modifica propria" on public.transport_requests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant insert, update on public.transport_request_addresses to authenticated;
create policy "transport_addresses: lettura" on public.transport_request_addresses for select to authenticated
  using (exists (select 1 from public.transport_requests t where t.id = request_id
                   and (t.user_id = (select auth.uid()) or (private.owns_profile(t.operator_profile_id) and t.status not in ('annullata'))))
         or private.has_permission('services.manage'));
create policy "transport_addresses: cliente inserisce" on public.transport_request_addresses for insert to authenticated
  with check (exists (select 1 from public.transport_requests t where t.id = request_id and t.user_id = (select auth.uid()) and t.status in ('aperta', 'preventivi_ricevuti')));
create policy "transport_addresses: cliente modifica" on public.transport_request_addresses for update to authenticated
  using (exists (select 1 from public.transport_requests t where t.id = request_id and t.user_id = (select auth.uid()) and t.status in ('aperta', 'preventivi_ricevuti')))
  with check (exists (select 1 from public.transport_requests t where t.id = request_id and t.user_id = (select auth.uid()) and t.status in ('aperta', 'preventivi_ricevuti')));

create policy "transport_quotes: lettura" on public.transport_quotes for select to authenticated
  using (private.owns_profile(profile_id) or exists (select 1 from public.transport_requests t where t.id = request_id and t.user_id = (select auth.uid()))
         or private.has_permission('services.manage'));
create policy "transport_reports: lettura" on public.transport_reports for select to authenticated
  using (exists (select 1 from public.transport_requests t where t.id = request_id and (t.user_id = (select auth.uid()) or private.owns_profile(t.operator_profile_id)))
         or private.has_permission('services.manage'));
create policy "transport_events: lettura" on public.transport_events for select to authenticated
  using (exists (select 1 from public.transport_requests t where t.id = request_id and (t.user_id = (select auth.uid()) or private.owns_profile(t.operator_profile_id)))
         or private.has_permission('services.manage'));

revoke all on function public.send_transport_quote(uuid, integer, date, date, boolean, text, integer) from public, anon;
grant execute on function public.send_transport_quote(uuid, integer, date, date, boolean, text, integer) to authenticated;
revoke all on function public.accept_transport_quote(uuid) from public, anon;
grant execute on function public.accept_transport_quote(uuid) to authenticated;
revoke all on function public.update_transport_status(uuid, text, text) from public, anon;
grant execute on function public.update_transport_status(uuid, text, text) to authenticated;
revoke all on function public.add_transport_report(uuid, text, integer, text, text, text, text[], text, text) from public, anon;
grant execute on function public.add_transport_report(uuid, text, integer, text, text, text, text[], text, text) to authenticated;
revoke all on function public.admin_cancel_transport(uuid, text) from public, anon;
grant execute on function public.admin_cancel_transport(uuid, text) to authenticated;
revoke all on function public.admin_set_service_operator(text, uuid, text, text) from public, anon;
grant execute on function public.admin_set_service_operator(text, uuid, text, text) to authenticated;

-- Foto di richieste e verbali (soccorso e trasporti): bucket privato, lettura con URL firmati solo per le parti.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-photos', 'service-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "service-photos: caricamento nella propria cartella" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "service-photos: eliminazione dei propri file" on storage.objects for delete to authenticated
  using (bucket_id = 'service-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "service-photos: lettura delle parti" on storage.objects for select to authenticated
  using (bucket_id = 'service-photos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.has_permission('services.manage')
    or exists (select 1 from public.transport_reports rp join public.transport_requests t on t.id = rp.request_id
               where name = any (rp.photo_paths) and t.user_id = (select auth.uid()))
    or exists (select 1 from public.transport_requests t where name = any (t.photo_paths)
               and (private.owns_profile(t.operator_profile_id) or (t.status in ('aperta', 'preventivi_ricevuti') and private.is_active_transporter())))
    or exists (select 1 from public.roadside_requests r where name = any (r.photo_paths)
               and (private.owns_profile(r.operator_profile_id) or private.roadside_is_target(r.id)))));

-- Pulizia periodica.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-roadside-housekeeping', '*/15 * * * *', 'select private.roadside_housekeeping()');
  end if;
end $$;

-- Funzioni private: nessun accesso diretto dai client.
revoke all on function private.open_service_conversation(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function private.roadside_housekeeping() from public, anon, authenticated;
grant execute on function private.roadside_operator_available(uuid), private.roadside_is_operator(uuid), private.roadside_is_target(uuid),
  private.is_active_transporter() to authenticated, service_role;
grant execute on function private.roadside_operator_available(uuid) to anon;

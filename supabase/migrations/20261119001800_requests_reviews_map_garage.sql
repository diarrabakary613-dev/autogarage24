-- =====================================================================
-- AutoGarage24 — Migrazione 0018 (Fasi 15–20): solo ciò che mancava.
-- Riusa richieste, preventivi, appuntamenti, conversazioni e recensioni
-- esistenti. Nessuna tabella duplicata (vedi docs/ANALISI_FASI_11_20.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fase 16 — Richieste di intervento inviate a più officine
-- Una richiesta di intervento (repair_requests) genera una "requests"
-- per ogni officina scelta: preventivi, appuntamenti, chat e recensioni
-- restano quelli già esistenti.
-- ---------------------------------------------------------------------
create table public.repair_requests (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  user_vehicle_id    uuid references public.user_vehicles (id) on delete set null,
  vehicle_make       text not null check (char_length(vehicle_make) between 1 and 60),
  vehicle_model      text not null check (char_length(vehicle_model) between 1 and 80),
  vehicle_year       integer check (vehicle_year between 1950 and 2100),
  fuel               public.fuel_type,
  mileage_km         integer check (mileage_km between 0 and 2000000),
  category           text not null check (category in ('meccanica_generale', 'tagliando', 'freni', 'pneumatici', 'elettronica', 'diagnosi',
                                                       'carrozzeria', 'batteria', 'climatizzazione', 'revisione', 'altro')),
  description        text not null check (char_length(description) between 20 and 4000),
  availability_text  text check (char_length(availability_text) <= 300),
  preferred_date     date,
  preferred_slot     public.time_slot not null default 'qualsiasi',
  city               text not null check (char_length(city) between 2 and 80),
  postal_code        text check (postal_code ~ '^[0-9]{5}$'),
  -- Posizione arrotondata (~1 km): serve solo a calcolare distanze, mai mostrata ad altri.
  latitude           numeric(5,2) check (latitude between -90 and 90),
  longitude          numeric(5,2) check (longitude between -180 and 180),
  status             text not null default 'aperta' check (status in ('aperta', 'assegnata', 'chiusa', 'annullata')),
  accepted_quote_id  uuid references public.quotes (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index repair_requests_owner_idx on public.repair_requests (owner_id, created_at desc);
create trigger repair_requests_updated before update on public.repair_requests for each row execute function private.set_updated_at();

alter table public.requests
  add column repair_request_id   uuid references public.repair_requests (id) on delete set null,
  add column fuel                public.fuel_type,
  add column mileage_km          integer check (mileage_km between 0 and 2000000),
  add column problem_category    text check (problem_category in ('meccanica_generale', 'tagliando', 'freni', 'pneumatici', 'elettronica', 'diagnosi',
                                                                   'carrozzeria', 'batteria', 'climatizzazione', 'revisione', 'altro')),
  -- Fase 17: tipo di richiesta su un ricambio.
  add column part_inquiry_type   text check (part_inquiry_type in ('informazioni', 'disponibilita', 'spedizione', 'ritiro'));
create index requests_repair_idx on public.requests (repair_request_id) where repair_request_id is not null;

alter table public.repair_requests enable row level security;
revoke all on table public.repair_requests from anon, authenticated;
grant select on table public.repair_requests to authenticated;
grant all on table public.repair_requests to service_role;
create policy "repair_requests: proprietario" on public.repair_requests for select to authenticated using (owner_id = (select auth.uid()));
-- L'officina destinataria vede la richiesta originale (non la posizione: è solo arrotondata e non esposta nelle viste).
create policy "repair_requests: officine destinatarie" on public.repair_requests for select to authenticated
  using (exists (select 1 from public.requests r where r.repair_request_id = repair_requests.id and r.recipient_id = (select auth.uid())));
create policy "repair_requests: staff" on public.repair_requests for select to authenticated using ((select private.is_staff()));

-- Preventivo dettagliato e indicativo (Fase 16).
alter table public.quotes
  add column labor_cents          bigint check (labor_cents >= 0 and labor_cents < 10000000000),
  add column parts_cents          bigint check (parts_cents >= 0 and parts_cents < 10000000000),
  add column is_indicative        boolean not null default true,
  add column requires_inspection  boolean not null default false,
  add constraint quotes_breakdown_total check (
    labor_cents is null or parts_cents is null
    or amount_cents = labor_cents + parts_cents + coalesce(extra_costs_cents, 0));

create or replace function public.send_quote_detailed(
  request_id uuid, description text, labor_cents bigint, parts_cents bigint, extra_costs_cents bigint default null,
  duration_text text default null, valid_until date default null, requires_inspection boolean default false,
  availability_text text default null, conditions text default null, materials text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _total bigint;
begin
  if labor_cents is null or parts_cents is null or labor_cents < 0 or parts_cents < 0 or coalesce(extra_costs_cents, 0) < 0 then
    raise exception 'Indica costo della manodopera e dei ricambi (anche 0)' using errcode = '22023';
  end if;
  if valid_until is null then raise exception 'Indica la validità del preventivo' using errcode = '22023'; end if;
  _total := labor_cents + parts_cents + coalesce(extra_costs_cents, 0);
  _id := public.send_quote(request_id, _total, description, extra_costs_cents, materials, duration_text, availability_text, conditions, valid_until);
  update public.quotes set labor_cents = send_quote_detailed.labor_cents, parts_cents = send_quote_detailed.parts_cents,
         is_indicative = true, requires_inspection = coalesce(send_quote_detailed.requires_inspection, false)
   where id = _id;
  return _id;
end;
$$;
revoke all on function public.send_quote_detailed(uuid, text, bigint, bigint, bigint, text, date, boolean, text, text, text) from public, anon;
grant execute on function public.send_quote_detailed(uuid, text, bigint, bigint, bigint, text, date, boolean, text, text, text) to authenticated;

create or replace function public.create_repair_request(
  p_vehicle_make text, p_vehicle_model text, p_vehicle_year integer, p_fuel public.fuel_type, p_mileage_km integer,
  p_category text, p_description text, p_availability text, p_preferred_date date, p_preferred_slot public.time_slot,
  p_city text, p_postal_code text, p_latitude double precision default null, p_longitude double precision default null,
  p_user_vehicle_id uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _v public.user_vehicles%rowtype;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per inviare una richiesta' using errcode = '42501'; end if;
  perform private.enforce_rate_limit('repair_request', 5, interval '1 day');
  if p_preferred_date is not null and p_preferred_date < current_date then raise exception 'La data non può essere nel passato' using errcode = '22023'; end if;
  if p_user_vehicle_id is not null then
    select * into _v from public.user_vehicles where id = p_user_vehicle_id and owner_id = auth.uid() and deleted_at is null;
    if not found then raise exception 'Automobile non trovata nel tuo garage' using errcode = 'P0002'; end if;
  end if;
  insert into public.repair_requests (owner_id, user_vehicle_id, vehicle_make, vehicle_model, vehicle_year, fuel, mileage_km, category,
    description, availability_text, preferred_date, preferred_slot, city, postal_code, latitude, longitude)
  values (auth.uid(), p_user_vehicle_id, coalesce(_v.make, trim(p_vehicle_make)), coalesce(_v.model, trim(p_vehicle_model)),
    coalesce(_v.year, p_vehicle_year), coalesce(_v.fuel, p_fuel), coalesce(p_mileage_km, _v.current_mileage_km), p_category,
    trim(p_description), nullif(trim(p_availability), ''), p_preferred_date, coalesce(p_preferred_slot, 'qualsiasi'),
    trim(p_city), nullif(trim(p_postal_code), ''),
    case when p_latitude is not null and p_longitude is not null then round(p_latitude::numeric, 2) end,
    case when p_latitude is not null and p_longitude is not null then round(p_longitude::numeric, 2) end)
  returning id into _id;
  perform private.log_activity(auth.uid(), 'repair.created', 'Richiesta di intervento creata', '/dashboard/richieste-intervento/' || _id);
  return _id;
end;
$$;
revoke all on function public.create_repair_request(text, text, integer, public.fuel_type, integer, text, text, text, date, public.time_slot, text, text, double precision, double precision, uuid) from public, anon;
grant execute on function public.create_repair_request(text, text, integer, public.fuel_type, integer, text, text, text, date, public.time_slot, text, text, double precision, double precision, uuid) to authenticated;

-- Distanza in km (formula dell'emisenoverso). Nessuna dipendenza da PostGIS.
create or replace function private.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = ''
as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null else
    6371 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) end
$$;

-- Categoria dell'intervento → categorie di servizio dei professionisti.
create or replace function private.repair_category_services(_c text)
returns text[] language sql immutable set search_path = ''
as $$
  select case _c
    when 'tagliando' then array['centro-tagliandi', 'tagliandi', 'manutenzione-ordinaria', 'officina-meccanica', 'meccanica-generale']
    when 'freni' then array['centro-freni', 'freni', 'officina-meccanica', 'meccanica-generale']
    when 'pneumatici' then array['gommista', 'centro-pneumatici', 'pneumatici']
    when 'elettronica' then array['elettrauto', 'diagnosi-elettronica', 'centro-diagnosi', 'ibride-elettriche']
    when 'diagnosi' then array['centro-diagnosi', 'diagnosi-elettronica', 'ricerca-guasti', 'elettrauto', 'officina-meccanica']
    when 'carrozzeria' then array['carrozzeria', 'cristalli']
    when 'batteria' then array['elettrauto', 'diagnosi-elettronica', 'ibride-elettriche']
    when 'climatizzazione' then array['climatizzazione']
    when 'revisione' then array['centro-revisioni']
    else array['officina-meccanica', 'meccanica-generale', 'motore', 'frizione', 'cambio', 'cambio-automatico', 'sospensioni', 'manutenzione-ordinaria'] end
$$;

-- Officine e meccanici compatibili: profilo pubblico e approvato, che accetta appuntamenti,
-- con un servizio attivo o una categoria coerente. Distanza SOLO se entrambe le posizioni sono note.
create or replace function public.match_workshops(repair_id uuid, radius_km integer default 25, max_rows integer default 20)
returns table (profile_id uuid, slug text, display_name text, professional_type public.app_role, city text,
               distance_km numeric, matched_services text[], rating_avg numeric, review_count bigint,
               verified boolean, already_sent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare _rr public.repair_requests%rowtype; _cats text[];
begin
  select * into _rr from public.repair_requests where id = repair_id and owner_id = auth.uid();
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  _cats := private.repair_category_services(_rr.category);
  return query
  select p.id, p.slug, p.display_name, p.professional_type, p.city,
         case when _rr.latitude is not null and p.latitude is not null
              then round(private.distance_km(_rr.latitude::float8, _rr.longitude::float8, p.latitude, p.longitude)::numeric, 1) end,
         coalesce((select array_agg(distinct s.name) from public.professional_services s
                    where s.profile_id = p.id and s.active and s.category = any(_cats)), '{}'),
         (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.profile_id = p.id and r.status = 'pubblicata'),
         (select count(*) from public.reviews r where r.profile_id = p.id and r.status = 'pubblicata'),
         (p.business_verified_at is not null or p.identity_verified_at is not null),
         exists (select 1 from public.requests q where q.repair_request_id = _rr.id and q.professional_profile_id = p.id)
    from public.professional_profiles p
   where p.professional_type in ('officina', 'meccanico') and p.is_published and p.review_status = 'approvato'
     and p.deleted_at is null and p.accepts_appointments and p.user_id <> auth.uid()
     and (exists (select 1 from public.professional_services s where s.profile_id = p.id and s.active and s.category = any(_cats))
          or p.categories && _cats)
     and (
       -- con posizione: entro il raggio (più l'area servita dichiarata dai meccanici a domicilio)
       (_rr.latitude is not null and p.latitude is not null
         and private.distance_km(_rr.latitude::float8, _rr.longitude::float8, p.latitude, p.longitude)
             <= least(greatest(radius_km, 1), 200) + coalesce(p.service_radius_km, 0))
       -- senza posizione: stessa città o CAP
       or ((_rr.latitude is null or p.latitude is null)
         and (lower(p.city) = lower(_rr.city) or (_rr.postal_code is not null and p.postal_code = _rr.postal_code))))
   order by 6 nulls last, 8 desc nulls last, p.display_name
   limit least(greatest(max_rows, 1), 50);
end;
$$;
revoke all on function public.match_workshops(uuid, integer, integer) from public, anon;
grant execute on function public.match_workshops(uuid, integer, integer) to authenticated;

-- Invio alle officine scelte dal cliente (max 5 alla volta, 10 in totale).
create or replace function public.dispatch_repair_request(repair_id uuid, profile_ids uuid[])
returns integer language plpgsql security definer set search_path = ''
as $$
declare _rr public.repair_requests%rowtype; _p uuid; _n integer := 0; _labels text; _subject text;
begin
  select * into _rr from public.repair_requests where id = repair_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _rr.status <> 'aperta' then raise exception 'La richiesta non è più aperta' using errcode = '22023'; end if;
  if coalesce(cardinality(profile_ids), 0) = 0 then raise exception 'Scegli almeno un''officina' using errcode = '22023'; end if;
  if cardinality(profile_ids) > 5 then raise exception 'Puoi scegliere al massimo 5 officine alla volta' using errcode = '22023'; end if;
  if (select count(*) from public.requests where repair_request_id = repair_id) + cardinality(profile_ids) > 10 then
    raise exception 'Hai raggiunto il massimo di 10 officine per questa richiesta' using errcode = '22023';
  end if;
  _labels := replace(_rr.category, '_', ' ');
  _subject := left(initcap(_labels) || ' — ' || _rr.vehicle_make || ' ' || _rr.vehicle_model, 200);
  foreach _p in array profile_ids loop
    -- Solo officine effettivamente compatibili (stessa logica della ricerca).
    if not exists (select 1 from public.match_workshops(repair_id, 200, 50) m where m.profile_id = _p and not m.already_sent) then
      raise exception 'Una delle officine scelte non è disponibile per questa richiesta' using errcode = '22023';
    end if;
    insert into public.requests (kind, requester_id, professional_profile_id, user_vehicle_id, vehicle_make, vehicle_model, vehicle_year,
      subject, message, preferred_date, preferred_slot, location_text, repair_request_id, fuel, mileage_km, problem_category)
    values ('preventivo', auth.uid(), _p, _rr.user_vehicle_id, _rr.vehicle_make, _rr.vehicle_model, _rr.vehicle_year,
      _subject, _rr.description || coalesce(E'\n\nDisponibilità: ' || _rr.availability_text, ''), _rr.preferred_date, _rr.preferred_slot,
      _rr.city || coalesce(' ' || _rr.postal_code, ''), _rr.id, _rr.fuel, _rr.mileage_km, _rr.category);
    _n := _n + 1;
  end loop;
  return _n;
end;
$$;
revoke all on function public.dispatch_repair_request(uuid, uuid[]) from public, anon;
grant execute on function public.dispatch_repair_request(uuid, uuid[]) to authenticated;

create or replace function public.cancel_repair_request(repair_id uuid, reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r record;
begin
  update public.repair_requests set status = 'annullata' where id = repair_id and owner_id = auth.uid() and status in ('aperta', 'assegnata');
  if not found then raise exception 'Richiesta non trovata o già chiusa' using errcode = 'P0002'; end if;
  for _r in select id, recipient_id, subject from public.requests where repair_request_id = repair_id and status not in ('completata', 'annullata', 'rifiutata') loop
    update public.requests set status = 'annullata', status_reason = coalesce(nullif(trim(reason), ''), 'Richiesta annullata dal cliente') where id = _r.id;
    perform private.notify(_r.recipient_id, 'richieste', 'Richiesta annullata dal cliente', _r.subject, '/dashboard/richieste/' || _r.id, 'repair-cancel:' || _r.id);
  end loop;
end;
$$;
revoke all on function public.cancel_repair_request(uuid, text) from public, anon;
grant execute on function public.cancel_repair_request(uuid, text) to authenticated;

-- Quando il cliente accetta un preventivo di una richiesta multipla, le altre officine vengono avvisate
-- e le loro richieste chiuse: nessuno resta ad aspettare inutilmente.
create or replace function private.quotes_after_accept()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _rr uuid; _r record;
begin
  if new.status <> 'accettato' or old.status = 'accettato' then return null; end if;
  select repair_request_id into _rr from public.requests where id = new.request_id;
  if _rr is null then return null; end if;
  update public.repair_requests set status = 'assegnata', accepted_quote_id = new.id where id = _rr;
  for _r in select id, recipient_id, subject from public.requests
             where repair_request_id = _rr and id <> new.request_id and status not in ('completata', 'annullata', 'rifiutata') loop
    update public.requests set status = 'annullata', status_reason = 'Il cliente ha scelto un altro preventivo' where id = _r.id;
    update public.quotes set status = 'ritirato' where request_id = _r.id and status = 'inviato';
    perform private.notify(_r.recipient_id, 'preventivi', 'Il cliente ha scelto un altro preventivo', _r.subject,
      '/dashboard/richieste/' || _r.id, 'repair-other:' || _r.id);
  end loop;
  return null;
end;
$$;
create trigger quotes_after_accept after update of status on public.quotes for each row execute function private.quotes_after_accept();

-- Allegati: foto e video brevi del problema (max 50 MB, limite del piano Supabase Free).
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
 where id = 'message-attachments';
alter table public.messages drop constraint if exists messages_attachment_mime_check;
alter table public.messages drop constraint if exists messages_attachment_size_check;
alter table public.messages
  add constraint messages_attachment_mime_check check (attachment_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm')),
  add constraint messages_attachment_size_check check (attachment_size > 0 and (attachment_size <= 10485760 or (attachment_mime like 'video/%' and attachment_size <= 52428800)));

-- ---------------------------------------------------------------------
-- Fase 15 — Appuntamenti: riprogrammazione in un'unica operazione
-- (l'annullamento esiste già in respond_appointment).
-- ---------------------------------------------------------------------
create or replace function public.reschedule_appointment(appointment_id uuid, new_date date, new_slot public.time_slot,
                                                         new_time text default null, note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _a public.appointments%rowtype; _r public.requests%rowtype; _id uuid;
begin
  select * into _a from public.appointments where id = appointment_id for update;
  if not found then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;
  select * into _r from public.requests where id = _a.request_id;
  if auth.uid() not in (_r.requester_id, _r.recipient_id) then raise exception 'Appuntamento non trovato' using errcode = 'P0002'; end if;
  if _a.status not in ('in_attesa', 'confermato', 'proposta_alternativa') then raise exception 'Questo appuntamento non si può modificare' using errcode = '22023'; end if;
  if new_date < current_date then raise exception 'La data non può essere nel passato' using errcode = '22023'; end if;
  update public.appointments set status = 'annullato', decision_reason = 'Riprogrammato' || coalesce(': ' || nullif(trim(reschedule_appointment.note), ''), ''), decided_at = now()
   where id = appointment_id;
  _id := public.propose_appointment(_a.request_id, new_date, new_slot, new_time, coalesce(nullif(trim(reschedule_appointment.note), ''), 'Nuova proposta di data'));
  return _id;
end;
$$;
revoke all on function public.reschedule_appointment(uuid, date, public.time_slot, text, text) from public, anon;
grant execute on function public.reschedule_appointment(uuid, date, public.time_slot, text, text) to authenticated;

-- Foto profilo degli interlocutori (solo per chi condivide una conversazione o una richiesta).
create or replace function public.counterpart_avatars(user_ids uuid[])
returns table (user_id uuid, bucket text, path text)
language sql stable security definer set search_path = ''
as $$
  select u.id,
         case when pp.logo_path is not null then 'business-media' else 'avatars' end,
         coalesce(pp.logo_path, pr.avatar_path)
    from unnest(user_ids[1:100]) as u(id)
    join public.profiles pr on pr.id = u.id
    left join lateral (select logo_path from public.professional_profiles p where p.user_id = u.id and p.is_published and p.logo_path is not null limit 1) pp on true
   where coalesce(pp.logo_path, pr.avatar_path) is not null
     and (private.is_staff()
          or exists (select 1 from public.conversation_participants a join public.conversation_participants b on a.conversation_id = b.conversation_id
                      where a.user_id = auth.uid() and b.user_id = u.id)
          or exists (select 1 from public.requests r where (r.requester_id = auth.uid() and r.recipient_id = u.id) or (r.recipient_id = auth.uid() and r.requester_id = u.id)))
$$;
revoke all on function public.counterpart_avatars(uuid[]) from public, anon;
grant execute on function public.counterpart_avatars(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Fase 17 — Ricambi: informazioni su spedizione/ritiro, preferiti con vincolo
-- ---------------------------------------------------------------------
alter table public.part_listings add column shipping_info text check (char_length(shipping_info) <= 600);
delete from public.favorites f where f.part_id is not null and not exists (select 1 from public.part_listings p where p.id = f.part_id);
alter table public.favorites drop constraint if exists favorites_part_fk;
alter table public.favorites add constraint favorites_part_fk foreign key (part_id) references public.part_listings (id) on delete cascade;
create unique index if not exists favorites_user_part_uniq on public.favorites (user_id, part_id) where part_id is not null;

-- ---------------------------------------------------------------------
-- Fase 18 — Recensioni dettagliate, recensioni di acquisto verificate,
-- storico e protezione dalle recensioni false
-- ---------------------------------------------------------------------
create table public.review_verifications (
  id                      uuid primary key default gen_random_uuid(),
  request_id              uuid not null unique references public.requests (id) on delete cascade,
  basis                   text not null check (basis in ('intervento_completato', 'appuntamento_completato', 'acquisto_confermato')),
  seller_confirmed_at     timestamptz,
  customer_confirmed_at   timestamptz,
  verified_at             timestamptz,
  created_at              timestamptz not null default now()
);
alter table public.review_verifications enable row level security;
revoke all on table public.review_verifications from anon, authenticated;
grant select on table public.review_verifications to authenticated;
grant all on table public.review_verifications to service_role;
create policy "review_verifications: parti e staff" on public.review_verifications for select to authenticated
  using ((select private.is_request_party(request_id)) or (select private.has_permission('reviews.moderate')));

alter table public.reviews
  add column review_kind            text not null default 'servizio' check (review_kind in ('servizio', 'acquisto')),
  add column experience_date        date check (experience_date >= date '2000-01-01'),
  add column quality_rating         integer check (quality_rating between 1 and 5),
  add column professionalism_rating integer check (professionalism_rating between 1 and 5),
  add column value_rating           integer check (value_rating between 1 and 5),
  add column accuracy_rating        integer check (accuracy_rating between 1 and 5),
  add column communication_rating   integer check (communication_rating between 1 and 5),
  add column reliability_rating     integer check (reliability_rating between 1 and 5),
  add column verification_id        uuid references public.review_verifications (id) on delete set null,
  add column suspicious_reason      text check (char_length(suspicious_reason) <= 300);

-- Conferma dell'acquisto: serve da ENTRAMBE le parti (venditore e acquirente).
create or replace function public.confirm_vehicle_purchase(request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _v public.review_verifications%rowtype; _uid uuid := auth.uid();
begin
  select * into _r from public.requests where id = request_id for update;
  if not found or _uid not in (_r.requester_id, _r.recipient_id) then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _r.kind not in ('info_auto', 'appuntamento_auto') or _r.listing_id is null then
    raise exception 'La conferma di acquisto riguarda solo le richieste su un''automobile' using errcode = '22023';
  end if;
  insert into public.review_verifications (request_id, basis) values (confirm_vehicle_purchase.request_id, 'acquisto_confermato')
  on conflict on constraint review_verifications_request_id_key do nothing;
  update public.review_verifications
     set seller_confirmed_at = case when _uid = _r.recipient_id then coalesce(seller_confirmed_at, now()) else seller_confirmed_at end,
         customer_confirmed_at = case when _uid = _r.requester_id then coalesce(customer_confirmed_at, now()) else customer_confirmed_at end
   where review_verifications.request_id = confirm_vehicle_purchase.request_id
  returning * into _v;
  if _v.seller_confirmed_at is not null and _v.customer_confirmed_at is not null and _v.verified_at is null then
    update public.review_verifications set verified_at = now() where id = _v.id;
    update public.requests set status = 'completata', completed_at = now() where id = _r.id and status <> 'completata';
    perform private.notify(_r.requester_id, 'automobili', 'Acquisto confermato: puoi lasciare una recensione', _r.subject, '/dashboard/richieste/' || _r.id, 'purchase:' || _r.id);
    return 'verificato';
  end if;
  perform private.notify(case when _uid = _r.recipient_id then _r.requester_id else _r.recipient_id end, 'automobili',
    'Conferma l''acquisto', 'L''altra parte ha indicato che l''acquisto è avvenuto: conferma per abilitare la recensione.', '/dashboard/richieste/' || _r.id, 'purchase-ask:' || _r.id || _uid);
  return 'in_attesa_altra_parte';
end;
$$;
revoke all on function public.confirm_vehicle_purchase(uuid) from public, anon;
grant execute on function public.confirm_vehicle_purchase(uuid) to authenticated;

-- Registrazione automatica della verifica per gli interventi completati.
create or replace function private.requests_completed_verification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'completata' and old.status is distinct from 'completata' and new.kind not in ('info_auto', 'appuntamento_auto') then
    insert into public.review_verifications (request_id, basis, verified_at)
    values (new.id, case when exists (select 1 from public.appointments a where a.request_id = new.id and a.status = 'completato')
                         then 'appuntamento_completato' else 'intervento_completato' end, now())
    on conflict (request_id) do nothing;
  end if;
  return null;
end;
$$;
create trigger requests_completed_verification after update of status on public.requests
  for each row execute function private.requests_completed_verification();
insert into public.review_verifications (request_id, basis, verified_at)
select r.id, 'intervento_completato', coalesce(r.completed_at, now()) from public.requests r
 where r.status = 'completata' and r.kind not in ('info_auto', 'appuntamento_auto') on conflict (request_id) do nothing;

create or replace function private.reviews_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype; _v public.review_verifications%rowtype;
begin
  select * into _r from public.requests where id = new.request_id;
  if not found or _r.requester_id <> auth.uid() or new.author_id <> auth.uid() then
    raise exception 'Puoi recensire solo un''esperienza richiesta da te' using errcode = '42501';
  end if;
  if _r.professional_profile_id is null or _r.professional_profile_id <> new.profile_id then
    raise exception 'Professionista non corrispondente alla richiesta' using errcode = '22023';
  end if;
  select * into _v from public.review_verifications where request_id = new.request_id and verified_at is not null;
  if not found then
    raise exception 'La recensione è possibile solo dopo un intervento completato o un acquisto confermato da entrambe le parti' using errcode = '42501';
  end if;
  new.review_kind := case when _v.basis = 'acquisto_confermato' then 'acquisto' else 'servizio' end;
  new.verification_id := _v.id;
  if new.experience_date is not null and new.experience_date > current_date then
    raise exception 'La data dell''esperienza non può essere futura' using errcode = '22023';
  end if;
  if new.review_kind = 'servizio' then
    if new.quality_rating is null or new.professionalism_rating is null or new.value_rating is null then
      raise exception 'Valuta qualità, professionalità e rapporto qualità-prezzo' using errcode = '22023';
    end if;
    new.accuracy_rating := null; new.communication_rating := null; new.reliability_rating := null;
  else
    if new.accuracy_rating is null or new.communication_rating is null or new.reliability_rating is null then
      raise exception 'Valuta accuratezza della descrizione, comunicazione e affidabilità' using errcode = '22023';
    end if;
    new.quality_rating := null; new.professionalism_rating := null; new.value_rating := null;
  end if;
  perform private.enforce_rate_limit('review', 5, interval '1 day');
  -- Testo identico già usato dallo stesso autore: rifiutato. Più recensioni allo stesso
  -- professionista in 30 giorni: pubblicate ma segnalate allo staff come sospette.
  if exists (select 1 from public.reviews x where x.author_id = auth.uid() and lower(trim(x.comment)) = lower(trim(new.comment))) then
    raise exception 'Hai già pubblicato una recensione con lo stesso testo' using errcode = '23505';
  end if;
  new.status := 'pubblicata'; new.reply := null; new.reply_at := null; new.moderation_note := null; new.suspicious_reason := null;
  if exists (select 1 from public.reviews x where x.author_id = auth.uid() and x.profile_id = new.profile_id and x.created_at > now() - interval '30 days') then
    new.suspicious_reason := 'Più recensioni dello stesso autore allo stesso professionista in 30 giorni';
  end if;
  return new;
end;
$$;

create or replace function private.reviews_flag_suspicious()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.suspicious_reason is not null then
    perform private.notify_staff('reviews.moderate', 'Recensione da controllare', new.suspicious_reason, '/admin/recensioni', 'review-sus:' || new.id);
  end if;
  return null;
end;
$$;
create trigger reviews_flag_suspicious after insert on public.reviews for each row execute function private.reviews_flag_suspicious();

-- I punteggi non sono modificabili da nessuno (staff incluso): lo staff può solo cambiare lo stato con motivazione.
create or replace function private.reviews_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (new.rating, new.title, new.comment, new.author_id, new.profile_id, new.request_id, new.review_kind, new.experience_date,
      new.quality_rating, new.professionalism_rating, new.value_rating, new.accuracy_rating, new.communication_rating,
      new.reliability_rating, new.verification_id)
     is distinct from (old.rating, old.title, old.comment, old.author_id, old.profile_id, old.request_id, old.review_kind, old.experience_date,
      old.quality_rating, old.professionalism_rating, old.value_rating, old.accuracy_rating, old.communication_rating,
      old.reliability_rating, old.verification_id) then
    raise exception 'Il contenuto e i punteggi di una recensione non possono essere modificati' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Storico immutabile di stato e risposta (decisioni di moderazione e risposta ufficiale).
create table public.review_history (
  id          bigint generated always as identity primary key,
  review_id   uuid not null references public.reviews (id) on delete cascade,
  changed_by  uuid references public.profiles (id) on delete set null,
  field       text not null check (field in ('status', 'reply')),
  old_value   text,
  new_value   text,
  note        text,
  created_at  timestamptz not null default now()
);
create index review_history_idx on public.review_history (review_id, created_at desc);
create trigger review_history_immutable before update or delete on public.review_history for each row execute function private.audit_logs_immutable();
create or replace function private.reviews_history()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.review_history (review_id, changed_by, field, old_value, new_value, note) values (new.id, auth.uid(), 'status', old.status, new.status, new.moderation_note);
  end if;
  if new.reply is distinct from old.reply then
    insert into public.review_history (review_id, changed_by, field, old_value, new_value) values (new.id, auth.uid(), 'reply', old.reply, new.reply);
  end if;
  return null;
end;
$$;
create trigger reviews_history after update on public.reviews for each row execute function private.reviews_history();
alter table public.review_history enable row level security;
revoke all on table public.review_history from anon, authenticated;
grant select on table public.review_history to authenticated;
grant all on table public.review_history to service_role;
create policy "review_history: staff" on public.review_history for select to authenticated using ((select private.has_permission('reviews.moderate')));

-- Riepilogo pubblico della reputazione (media, distribuzione e medie per criterio).
create or replace function public.profile_reputation(profile_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when not private.profile_is_public(profile_reputation.profile_id) then null else jsonb_build_object(
    'count', count(*),
    'average', round(avg(rating)::numeric, 1),
    'distribution', jsonb_build_object('5', count(*) filter (where rating = 5), '4', count(*) filter (where rating = 4),
                                       '3', count(*) filter (where rating = 3), '2', count(*) filter (where rating = 2), '1', count(*) filter (where rating = 1)),
    'service', jsonb_build_object('count', count(*) filter (where review_kind = 'servizio'),
       'quality', round(avg(quality_rating)::numeric, 1), 'professionalism', round(avg(professionalism_rating)::numeric, 1), 'value', round(avg(value_rating)::numeric, 1)),
    'purchase', jsonb_build_object('count', count(*) filter (where review_kind = 'acquisto'),
       'accuracy', round(avg(accuracy_rating)::numeric, 1), 'communication', round(avg(communication_rating)::numeric, 1), 'reliability', round(avg(reliability_rating)::numeric, 1)),
    'replies', count(*) filter (where reply is not null)) end
    from public.reviews r where r.profile_id = profile_reputation.profile_id and r.status = 'pubblicata'
$$;
grant execute on function public.profile_reputation(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Fase 19 — Mappa unica: professionisti, ricambi e auto (anche solo neopatentati)
-- Le posizioni pubbliche sono arrotondate a ~1 km salvo indirizzo reso pubblico.
-- ---------------------------------------------------------------------
create index if not exists professional_profiles_geo_idx on public.professional_profiles (latitude, longitude) where is_published;
create index if not exists vehicle_listings_geo_idx on public.vehicle_listings (latitude, longitude) where status = 'pubblicato';
create index if not exists part_listings_geo_idx on public.part_listings (latitude, longitude) where status = 'pubblicato';

create or replace function public.map_search(
  p_kinds text[] default array['officina', 'meccanico', 'venditore_auto', 'venditore_ricambi'],
  p_lat double precision default null, p_lng double precision default null, p_radius_km integer default 25,
  p_city text default null, p_postal_code text default null, p_category text default null, p_brand text default null,
  p_price_max_cents bigint default null, p_min_rating numeric default null, p_only_available boolean default false,
  p_neo_only boolean default false, p_limit integer default 200)
returns table (kind text, id uuid, slug text, name text, city text, address text, latitude double precision, longitude double precision,
               approximate boolean, distance_km numeric, rating_avg numeric, review_count bigint, photo_bucket text, photo_path text,
               subtitle text, price_cents bigint, year integer, mileage_km integer, neo_result public.neo_result, accepts_appointments boolean)
language sql stable security definer set search_path = ''
as $$
  with params as (
    select least(greatest(coalesce(p_radius_km, 25), 1), 200) as radius,
           nullif(lower(trim(p_city)), '') as city, nullif(trim(p_postal_code), '') as cap,
           nullif(lower(trim(p_brand)), '') as brand, nullif(trim(p_category), '') as category,
           (p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180) as has_pos
  ),
  pros as (
    select p.professional_type::text as kind, p.id, p.slug, p.display_name as name, p.city,
           case when p.show_address then p.address_line end as address,
           case when p.show_address then p.latitude else round(p.latitude::numeric, 2)::float8 end as lat,
           case when p.show_address then p.longitude else round(p.longitude::numeric, 2)::float8 end as lng,
           not p.show_address as approximate,
           (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.profile_id = p.id and r.status = 'pubblicata') as rating_avg,
           (select count(*) from public.reviews r where r.profile_id = p.id and r.status = 'pubblicata') as review_count,
           'business-media'::text as photo_bucket, p.logo_path as photo_path,
           (select string_agg(s.name, ' · ' order by s.position) from (select name, position from public.professional_services s
              where s.profile_id = p.id and s.active order by position limit 3) s) as subtitle,
           null::bigint as price_cents, null::integer as year, null::integer as mileage_km, null::public.neo_result as neo_result,
           p.accepts_appointments, p.postal_code
      from public.professional_profiles p, params x
     where p.is_published and p.review_status = 'approvato' and p.deleted_at is null and p.latitude is not null
       and p.professional_type::text = any(p_kinds) and not coalesce(p_neo_only, false)
       and (x.category is null or p.categories @> array[x.category]
            or exists (select 1 from public.professional_services s where s.profile_id = p.id and s.active and s.category = x.category))
       and (x.brand is null or exists (select 1 from unnest(p.brands_served) b where lower(b) = x.brand))
       and (not coalesce(p_only_available, false) or p.accepts_appointments)
  ),
  cars as (
    select 'auto'::text, l.id, l.slug, l.title, l.city, null::text,
           round(l.latitude::numeric, 2)::float8, round(l.longitude::numeric, 2)::float8, true,
           null::numeric, null::bigint, 'listing-images'::text,
           (select i.storage_path from public.vehicle_images i where i.listing_id = l.id order by i.is_cover desc, i.position limit 1),
           v.make_name || ' ' || v.model || coalesce(' ' || v.version, ''), l.price_cents, v.year, v.mileage_km, l.neo_result, null::boolean, l.postal_code
      from public.vehicle_listings l join public.vehicles v on v.id = l.vehicle_id, params x
     where l.status = 'pubblicato' and l.latitude is not null
       and ('auto' = any(p_kinds) or coalesce(p_neo_only, false))
       and (not coalesce(p_neo_only, false) or l.neo_result = 'compatibile')
       and (x.brand is null or lower(v.make_slug) = x.brand or lower(v.make_name) = x.brand)
       and (p_price_max_cents is null or l.price_cents <= p_price_max_cents)
  ),
  parts as (
    select 'ricambio'::text, pl.id, pl.slug, pl.title, pl.city, null::text,
           round(pl.latitude::numeric, 2)::float8, round(pl.longitude::numeric, 2)::float8, true,
           null::numeric, null::bigint, 'listing-images'::text,
           (select i.storage_path from public.part_images i where i.part_id = pl.id order by i.is_cover desc, i.position limit 1),
           coalesce(pl.manufacturer_brand, '') || coalesce(' · OEM ' || pl.oem_code, ''), pl.price_cents, null::integer, null::integer, null::public.neo_result,
           (coalesce(pl.quantity, 1) > 0), pl.postal_code
      from public.part_listings pl, params x
     where pl.status = 'pubblicato' and pl.latitude is not null and 'ricambio' = any(p_kinds) and not coalesce(p_neo_only, false)
       and (p_price_max_cents is null or pl.price_cents <= p_price_max_cents)
       and (not coalesce(p_only_available, false) or coalesce(pl.quantity, 1) > 0)
  ),
  allrows as (select * from pros union all select * from cars union all select * from parts)
  select a.kind, a.id, a.slug, a.name, a.city, a.address, a.lat, a.lng, a.approximate,
         case when x.has_pos then round(private.distance_km(p_lat, p_lng, a.lat, a.lng)::numeric, 1) end,
         a.rating_avg, a.review_count, a.photo_bucket, a.photo_path, a.subtitle, a.price_cents, a.year, a.mileage_km, a.neo_result, a.accepts_appointments
    from allrows a, params x
   where (p_min_rating is null or coalesce(a.rating_avg, 0) >= p_min_rating)
     and (case when x.has_pos then private.distance_km(p_lat, p_lng, a.lat, a.lng) <= x.radius
               else (x.city is null or lower(a.city) = x.city) and (x.cap is null or a.postal_code = x.cap) end)
   order by 10 nulls last, a.name
   limit least(greatest(coalesce(p_limit, 200), 1), 300)
$$;
grant execute on function public.map_search(text[], double precision, double precision, integer, text, text, text, text, bigint, numeric, boolean, boolean, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Fase 20 — Il mio Garage: officine già contattate per un veicolo
-- ---------------------------------------------------------------------
create or replace function public.vehicle_contacted_professionals(vehicle_id uuid)
returns table (profile_id uuid, slug text, display_name text, professional_type public.app_role, last_request_at timestamptz, requests_count bigint)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.slug, p.display_name, p.professional_type, max(r.created_at), count(*)
    from public.requests r join public.professional_profiles p on p.id = r.professional_profile_id
   where r.user_vehicle_id = vehicle_id and r.requester_id = auth.uid()
     and exists (select 1 from public.user_vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
   group by p.id, p.slug, p.display_name, p.professional_type
   order by 5 desc
$$;
revoke all on function public.vehicle_contacted_professionals(uuid) from public, anon;
grant execute on function public.vehicle_contacted_professionals(uuid) to authenticated;

-- Spesa pubblicitaria: l'approvazione spetta solo al fondatore (Super Admin).
create or replace function private.budget_founder_only()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.founder_approved and (tg_op = 'INSERT' or not old.founder_approved)
     and not private.has_role('super_admin'::public.app_role) and auth.uid() is not null then
    raise exception 'Solo il fondatore può approvare una spesa' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger ad_budget_founder_only before insert or update on public.ad_budget_entries for each row execute function private.budget_founder_only();

-- Predisposizione per le notifiche push (Fase 20): preferenze e iscrizioni dei dispositivi.
-- L'invio push NON è attivo: richiede chiavi VAPID e un service worker (vedi docs/NOTIFICHE_PUSH.md).
alter table public.notification_preferences add column push jsonb not null default '{}'::jsonb;
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  endpoint    text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth_key    text not null check (char_length(auth_key) <= 100),
  user_agent  text check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;
create policy "push_subscriptions: proprie" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

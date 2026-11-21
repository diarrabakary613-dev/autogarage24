-- =====================================================================
-- AutoGarage24 — Migrazione 0012 (Fasi 3, 5, 6, 7): preferiti,
-- recensioni autentiche, segnalazioni recensioni, ricerca professionisti.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Preferiti: un solo record per utente e oggetto
-- ---------------------------------------------------------------------
create table public.favorites (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles (id) on delete cascade,
  listing_id               uuid references public.vehicle_listings (id) on delete cascade,
  professional_profile_id  uuid references public.professional_profiles (id) on delete cascade,
  part_id                  uuid,
  created_at               timestamptz not null default now(),
  check (num_nonnulls(listing_id, professional_profile_id, part_id) = 1)
);
create unique index favorites_listing_uq on public.favorites (user_id, listing_id) where listing_id is not null;
create unique index favorites_profile_uq on public.favorites (user_id, professional_profile_id) where professional_profile_id is not null;
create unique index favorites_part_uq on public.favorites (user_id, part_id) where part_id is not null;

alter table public.favorites enable row level security;
revoke all on table public.favorites from anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;
grant all on table public.favorites to service_role;
create policy "favorites: solo titolare" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Conteggio dei preferiti ricevuti (solo il numero, nessun dato personale).
create or replace function public.listing_favorite_count(listing_id uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.favorites f
   where f.listing_id = listing_favorite_count.listing_id
     and exists (select 1 from public.vehicle_listings l where l.id = f.listing_id and l.owner_id = auth.uid());
$$;
grant execute on function public.listing_favorite_count(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Recensioni: consentite SOLO su una richiesta completata tramite la
-- piattaforma, una per richiesta, scritte dal cliente.
-- ---------------------------------------------------------------------
create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.professional_profiles (id) on delete cascade,
  author_id       uuid not null references public.profiles (id) on delete cascade,
  request_id      uuid not null unique references public.requests (id) on delete cascade,
  rating          integer not null check (rating between 1 and 5),
  title           text check (char_length(title) <= 120),
  comment         text not null check (char_length(comment) between 10 and 3000),
  service_label   text check (char_length(service_label) <= 120),
  status          text not null default 'pubblicata' check (status in ('pubblicata', 'in_moderazione', 'nascosta')),
  moderation_note text check (char_length(moderation_note) <= 1000),
  reply           text check (char_length(reply) <= 2000),
  reply_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index reviews_profile_idx on public.reviews (profile_id, created_at desc) where status = 'pubblicata';
create trigger reviews_set_updated_at before update on public.reviews for each row execute function private.set_updated_at();

create or replace function private.reviews_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _r public.requests%rowtype;
begin
  select * into _r from public.requests where id = new.request_id;
  if not found or _r.requester_id <> auth.uid() or new.author_id <> auth.uid() then
    raise exception 'Puoi recensire solo un intervento richiesto da te' using errcode = '42501';
  end if;
  if _r.status <> 'completata' then
    raise exception 'La recensione è possibile solo dopo un intervento completato tramite AutoGarage24' using errcode = '42501';
  end if;
  if _r.professional_profile_id is null or _r.professional_profile_id <> new.profile_id then
    raise exception 'Professionista non corrispondente alla richiesta' using errcode = '22023';
  end if;
  new.status := 'pubblicata'; new.reply := null; new.reply_at := null; new.moderation_note := null;
  return new;
end;
$$;
create trigger reviews_before_insert before insert on public.reviews for each row execute function private.reviews_before_insert();

-- Il contenuto della recensione non è modificabile da nessuno (nemmeno dallo staff):
-- lo staff può solo nasconderla/ripristinarla con motivazione tracciata.
create or replace function private.reviews_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (new.rating, new.title, new.comment, new.author_id, new.profile_id, new.request_id)
     is distinct from (old.rating, old.title, old.comment, old.author_id, old.profile_id, old.request_id) then
    raise exception 'Il contenuto di una recensione non può essere modificato' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger reviews_before_update before update on public.reviews for each row execute function private.reviews_before_update();

create or replace function private.reviews_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _owner uuid;
begin
  select user_id into _owner from public.professional_profiles where id = new.profile_id;
  perform private.notify(_owner, 'account', 'Nuova recensione ricevuta', new.rating || '/5 — ' || left(new.comment, 100),
    '/dashboard/recensioni', 'review:' || new.id, 'nuova_recensione');
  return null;
end;
$$;
create trigger reviews_after_insert after insert on public.reviews for each row execute function private.reviews_after_insert();

create or replace function public.reply_to_review(review_id uuid, reply_text text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(coalesce(trim(reply_text), '')) < 2 then raise exception 'Scrivi una risposta' using errcode = '22023'; end if;
  update public.reviews set reply = reply_text, reply_at = now()
   where id = review_id and private.owns_profile(profile_id);
  if not found then raise exception 'Recensione non trovata' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.admin_moderate_review(review_id uuid, new_status text, note text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('reviews.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if new_status not in ('pubblicata', 'nascosta', 'in_moderazione') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  if coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  update public.reviews set status = new_status, moderation_note = note where id = review_id;
  perform private.log_admin_action('review.' || new_status, 'reviews', review_id::text, jsonb_build_object('note', note));
end;
$$;

create table public.review_reports (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(reason) between 5 and 1000),
  status       text not null default 'aperta' check (status in ('aperta', 'accolta', 'respinta')),
  created_at   timestamptz not null default now(),
  unique (review_id, reporter_id)
);

alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;
revoke all on table public.reviews, public.review_reports from anon, authenticated;
grant all on table public.reviews, public.review_reports to service_role;
grant select on table public.reviews to anon, authenticated;
grant insert on table public.reviews to authenticated;
create policy "reviews: lettura pubblica" on public.reviews for select to anon, authenticated
  using (status = 'pubblicata' and private.profile_is_public(profile_id));
create policy "reviews: autore e professionista" on public.reviews for select to authenticated
  using (author_id = (select auth.uid()) or private.owns_profile(profile_id));
create policy "reviews: staff" on public.reviews for select to authenticated using ((select private.has_permission('reviews.moderate')));
create policy "reviews: creazione autore" on public.reviews for insert to authenticated with check (author_id = (select auth.uid()));

grant select, insert on table public.review_reports to authenticated;
create policy "review_reports: segnalante e staff" on public.review_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_permission('reviews.moderate')));
create policy "review_reports: creazione" on public.review_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'aperta');

revoke all on function public.reply_to_review(uuid, text), public.admin_moderate_review(uuid, text, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text), public.admin_moderate_review(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Ricerca professionisti (testo, città/CAP, categoria, raggio, verificati)
-- La distanza è calcolata SOLO se il profilo ha coordinate reali.
-- ---------------------------------------------------------------------
create or replace function public.search_professionals(
  p_type public.app_role,
  p_query text default null,
  p_city text default null,
  p_postal_code text default null,
  p_region text default null,
  p_category text default null,
  p_brand text default null,
  p_work_mode public.work_mode default null,
  p_verified_only boolean default false,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_sort text default 'nome',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, display_name text, description text, city text, province text, region text,
  categories text[], work_modes public.work_mode[], experience_years integer, logo_path text,
  latitude double precision, longitude double precision, distance_km double precision,
  business_verified boolean, identity_verified boolean, rating_avg numeric, rating_count integer,
  created_at timestamptz, total_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  with base as (
    select pp.*,
      case when p_lat is not null and p_lng is not null and pp.latitude is not null then
        6371 * 2 * asin(sqrt(power(sin(radians(pp.latitude - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians(pp.latitude)) * power(sin(radians(pp.longitude - p_lng) / 2), 2)))
      end as dist
    from public.professional_profiles pp
    where pp.professional_type = p_type
      and pp.is_published and pp.review_status = 'approvato' and pp.deleted_at is null
      and (p_query is null or pp.display_name ilike '%' || p_query || '%' or pp.description ilike '%' || p_query || '%')
      and (p_city is null or lower(pp.city) = lower(trim(p_city)))
      and (p_postal_code is null or pp.postal_code = trim(p_postal_code))
      and (p_region is null or lower(pp.region) = lower(trim(p_region)))
      and (p_category is null or p_category = any(pp.categories)
           or exists (select 1 from public.professional_services s where s.profile_id = pp.id and s.active and s.category = p_category))
      and (p_brand is null or exists (select 1 from unnest(pp.brands_served) b where lower(b) = lower(p_brand)))
      and (p_work_mode is null or p_work_mode = any(pp.work_modes))
      and (not p_verified_only or pp.business_verified_at is not null)
  ), filtered as (
    select * from base where p_radius_km is null or (dist is not null and dist <= p_radius_km)
  ), rated as (
    select f.*, r.avg_rating, coalesce(r.cnt, 0)::integer as cnt
    from filtered f
    left join lateral (
      select round(avg(rv.rating)::numeric, 1) as avg_rating, count(*) as cnt
      from public.reviews rv where rv.profile_id = f.id and rv.status = 'pubblicata'
    ) r on true
  )
  select id, slug, display_name, description, city, province, region, categories, work_modes, experience_years,
         logo_path, latitude, longitude, round(dist::numeric, 1)::double precision,
         business_verified_at is not null, identity_verified_at is not null, avg_rating, cnt, created_at,
         count(*) over ()
  from rated
  order by
    case when p_sort = 'distanza' then dist end asc nulls last,
    case when p_sort = 'recenti' then created_at end desc,
    case when p_sort = 'valutazione' then avg_rating end desc nulls last,
    display_name asc
  limit least(greatest(p_limit, 1), 48) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_professionals(public.app_role, text, text, text, text, text, text, public.work_mode, boolean, double precision, double precision, integer, text, integer, integer) to anon, authenticated;

-- =====================================================================
-- AutoGarage24 — Migrazione 0016 (Fase 4): la vista di ricerca include lo
-- stato neopatentati e l'origine dell'annuncio (filtri lato database).
-- =====================================================================
create or replace view public.listing_search with (security_invoker = true) as
select
  l.id, l.slug, l.title, l.price_cents, l.negotiable, l.city, l.postal_code, l.province, l.region,
  l.latitude, l.longitude, l.seller_kind, l.status, l.published_at, l.sold_at, l.created_at,
  l.professional_profile_id, l.view_count,
  v.make_slug, v.make_name, v.model, v.version, v.year, v.mileage_km, v.fuel, v.transmission, v.body_type,
  v.condition, v.power_kw, v.engine_cc, v.first_registration_date,
  coalesce(pp.display_name, 'Venditore privato') as seller_name,
  (select i.storage_path from public.vehicle_images i where i.listing_id = l.id order by i.is_cover desc, i.position limit 1) as cover_path,
  lower(v.make_name || ' ' || v.model || ' ' || coalesce(v.version, '') || ' ' || l.title) as search_text,
  l.neo_result, l.source, v.consumption_l100, v.tare_kg, v.power_to_tare_documented
from public.vehicle_listings l
join public.vehicles v on v.id = l.vehicle_id
left join public.professional_profiles pp on pp.id = l.professional_profile_id;
grant select on public.listing_search to anon, authenticated;

-- ---------------------------------------------------------------------
-- Difesa: alla creazione i campi di moderazione/sistema sono sempre azzerati,
-- anche se il client prova a valorizzarli (la grant di INSERT è a livello tabella).
-- ---------------------------------------------------------------------
create or replace function private.vehicle_listings_reset_system_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.approved_by := null; new.approved_at := null; new.published_at := null; new.expires_at := null;
  new.sold_at := null; new.view_count := 0; new.admin_suspended := false; new.owner_suspended := false;
  new.status_note := null; new.neo_result := null; new.neo_checked_at := null; new.neo_rule_version_id := null;
  if new.source is distinct from 'field_manager' then new.field_contact_id := null; end if;
  return new;
end;
$$;
create trigger vehicle_listings_a_reset_system_fields before insert on public.vehicle_listings
  for each row execute function private.vehicle_listings_reset_system_fields();

-- ---------------------------------------------------------------------
-- Nome visualizzato degli interlocutori (Fase 9): restituisce SOLO un nome
-- ridotto ("Mario R." oppure il nome dell'attività) e solo per utenti con cui
-- il chiamante condivide una conversazione o una richiesta. Nessuna email/telefono.
-- ---------------------------------------------------------------------
create or replace function public.counterpart_names(user_ids uuid[])
returns table (user_id uuid, display_name text, is_professional boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id,
         coalesce(
           (select pp.display_name from public.professional_profiles pp
             where pp.user_id = p.id and pp.review_status = 'approvato' and pp.deleted_at is null
             order by pp.created_at limit 1),
           nullif(trim(split_part(coalesce(p.full_name, ''), ' ', 1) ||
                  case when position(' ' in trim(coalesce(p.full_name, ''))) > 0
                       then ' ' || left(trim(split_part(trim(p.full_name), ' ', 2)), 1) || '.' else '' end), ''),
           'Utente AutoGarage24'),
         exists (select 1 from public.professional_profiles pp where pp.user_id = p.id and pp.review_status = 'approvato' and pp.deleted_at is null)
  from public.profiles p
  where p.id = any (user_ids[1:200])
    and (p.id = (select auth.uid())
         or private.is_staff()
         or exists (select 1 from public.conversation_participants a
                    join public.conversation_participants b on b.conversation_id = a.conversation_id
                    where a.user_id = (select auth.uid()) and b.user_id = p.id)
         or exists (select 1 from public.requests r
                    where (r.requester_id = (select auth.uid()) and r.recipient_id = p.id)
                       or (r.recipient_id = (select auth.uid()) and r.requester_id = p.id)));
$$;
revoke all on function public.counterpart_names(uuid[]) from public, anon;
grant execute on function public.counterpart_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Privacy dei professionisti: indirizzo e coordinate esatte non sono più
-- leggibili direttamente dall'API. Il pubblico vede l'indirizzo solo se
-- show_address = true; altrimenti coordinate arrotondate (~1 km).
-- Il titolare e lo staff autorizzato leggono i dati completi tramite funzioni.
-- ---------------------------------------------------------------------
revoke select on table public.professional_profiles from anon, authenticated;
grant select (id, user_id, professional_type, display_name, slug, description, phone_public, email_public, website, show_address,
              city, province, postal_code, country_code, is_published, identity_verified_at, business_verified_at, documents_checked_at,
              created_at, updated_at, deleted_at, review_status, reviewed_at, submitted_at, categories, brands_served, opening_hours,
              closed_days, region, logo_path, cover_path, work_modes, experience_years, service_area, service_radius_km,
              accepts_appointments, view_count)
  on public.professional_profiles to anon, authenticated;

-- Posizione pubblica (mascherata) dei profili approvati.
create or replace function public.professional_locations(profile_ids uuid[])
returns table (profile_id uuid, address_line text, latitude double precision, longitude double precision, approximate boolean)
language sql stable security definer set search_path = ''
as $$
  select pp.id,
         case when pp.show_address then pp.address_line end,
         case when pp.show_address then pp.latitude else round(pp.latitude::numeric, 2)::double precision end,
         case when pp.show_address then pp.longitude else round(pp.longitude::numeric, 2)::double precision end,
         not pp.show_address
  from public.professional_profiles pp
  where pp.id = any (profile_ids[1:100]) and private.profile_is_public(pp.id) and pp.latitude is not null;
$$;
grant execute on function public.professional_locations(uuid[]) to anon, authenticated;

-- Dati completi per il titolare (modifica del profilo) e per lo staff autorizzato (verifiche).
create or replace function public.professional_private_details(profile_id uuid)
returns table (address_line text, latitude double precision, longitude double precision, contact_person text, review_note text)
language sql stable security definer set search_path = ''
as $$
  select pp.address_line, pp.latitude, pp.longitude, pp.contact_person, pp.review_note
  from public.professional_profiles pp
  where pp.id = profile_id
    and (pp.user_id = (select auth.uid()) or private.has_permission('professionals.verify'));
$$;
revoke all on function public.professional_private_details(uuid) from public, anon;
grant execute on function public.professional_private_details(uuid) to authenticated;

-- La ricerca diventa SECURITY DEFINER (legge le coordinate) ma restituisce solo profili pubblici
-- e coordinate mascherate quando l'indirizzo non è pubblico.
drop function public.search_professionals(public.app_role, text, text, text, text, text, text, public.work_mode, boolean,
  double precision, double precision, integer, text, integer, integer);
create function public.search_professionals(
  p_type public.app_role, p_query text default null, p_city text default null, p_postal_code text default null,
  p_region text default null, p_category text default null, p_brand text default null, p_work_mode public.work_mode default null,
  p_verified_only boolean default false, p_lat double precision default null, p_lng double precision default null,
  p_radius_km integer default null, p_sort text default 'nome', p_limit integer default 12, p_offset integer default 0)
returns table (
  id uuid, slug text, display_name text, description text, city text, province text, region text,
  categories text[], work_modes public.work_mode[], experience_years integer, logo_path text,
  latitude double precision, longitude double precision, distance_km double precision,
  business_verified boolean, identity_verified boolean, rating_avg numeric, rating_count integer,
  created_at timestamptz, total_count bigint)
language sql stable security definer set search_path = ''
as $$
  with base as (
    select pp.*,
      case when p_lat is not null and p_lng is not null and pp.latitude is not null then
        6371 * 2 * asin(sqrt(power(sin(radians(pp.latitude - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians(pp.latitude)) * power(sin(radians(pp.longitude - p_lng) / 2), 2)))
      end as dist
    from public.professional_profiles pp
    where pp.professional_type = p_type
      and private.profile_is_public(pp.id)
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
    select * from base where p_radius_km is null or (dist is not null and dist <= p_radius_km + coalesce(service_radius_km, 0))
  ), rated as (
    select f.*, r.avg_rating, coalesce(r.cnt, 0)::integer as cnt
    from filtered f
    left join lateral (
      select round(avg(rv.rating)::numeric, 1) as avg_rating, count(*) as cnt
      from public.reviews rv where rv.profile_id = f.id and rv.status = 'pubblicata'
    ) r on true
  )
  select id, slug, display_name, description, city, province, region, categories, work_modes, experience_years, logo_path,
         case when show_address then latitude else round(latitude::numeric, 2)::double precision end,
         case when show_address then longitude else round(longitude::numeric, 2)::double precision end,
         round(dist::numeric, 0)::double precision,
         business_verified_at is not null, identity_verified_at is not null, avg_rating, cnt, created_at, count(*) over ()
  from rated
  order by
    case when p_sort = 'distanza' then dist end asc nulls last,
    case when p_sort = 'recenti' then created_at end desc,
    case when p_sort = 'valutazione' then avg_rating end desc nulls last,
    display_name asc
  limit least(greatest(p_limit, 1), 48) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_professionals(public.app_role, text, text, text, text, text, text, public.work_mode, boolean,
  double precision, double precision, integer, text, integer, integer) to anon, authenticated;

-- L'esportazione dei dati personali legge anche le colonne private del proprio profilo
-- professionale: la funzione resta limitata ad auth.uid() ma gira con i privilegi del proprietario.
alter function public.export_my_data() security definer;

-- ---------------------------------------------------------------------
-- Un utente già registrato attiva un profilo professionale (Fasi 5–7).
-- Solo ruoli professionali (mai ruoli di staff), un profilo per tipologia,
-- stato iniziale "bozza": nulla diventa pubblico senza revisione.
-- ---------------------------------------------------------------------
create or replace function public.become_professional(kind public.app_role, business_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := auth.uid(); _id uuid; _name text := nullif(left(trim(business_name), 120), '');
begin
  if _uid is null or not private.is_active_user() then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if kind not in ('officina', 'meccanico', 'venditore_ricambi', 'venditore_auto') then
    raise exception 'Tipologia non valida' using errcode = '22023';
  end if;
  if _name is null or char_length(_name) < 2 then raise exception 'Indica il nome dell''attività' using errcode = '22023'; end if;
  select id into _id from public.professional_profiles where user_id = _uid and professional_type = kind and deleted_at is null;
  if _id is not null then return _id; end if;
  perform private.enforce_rate_limit('become_professional', 5, interval '1 day');
  insert into public.user_roles (user_id, role) values (_uid, kind) on conflict do nothing;
  insert into public.professional_profiles (user_id, professional_type, display_name, slug)
  values (_uid, kind, _name, private.unique_slug(_name)) returning id into _id;
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (_uid, 'professional.activated', 'professional_profiles', _id, jsonb_build_object('type', kind));
  return _id;
end;
$$;
revoke all on function public.become_professional(public.app_role, text) from public, anon;
grant execute on function public.become_professional(public.app_role, text) to authenticated;

-- Invio per verifica di uno specifico profilo (un utente può avere più profili professionali).
create or replace function public.submit_professional_profile(profile_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _p public.professional_profiles%rowtype;
begin
  select * into _p from public.professional_profiles pp where pp.id = profile_id and pp.user_id = (select auth.uid()) for update;
  if not found then raise exception 'Profilo professionale non trovato' using errcode = 'P0002'; end if;
  if not private.is_active_user() then raise exception 'Account non attivo' using errcode = '42501'; end if;
  if _p.review_status not in ('bozza', 'rifiutato') then raise exception 'Il profilo è già stato inviato' using errcode = '22023'; end if;
  if _p.city is null or coalesce(_p.description, '') = '' or cardinality(_p.categories) = 0 then
    raise exception 'Completa città, descrizione e almeno una categoria prima dell''invio' using errcode = '22023';
  end if;
  update public.professional_profiles set review_status = 'inviato', submitted_at = now(), review_note = null where id = _p.id;
end;
$$;
revoke all on function public.submit_professional_profile(uuid) from public, anon;
grant execute on function public.submit_professional_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Ricambi (Fase 7): campi di sistema azzerati alla creazione e base della
-- compatibilità "catalogo produttore" riservata allo staff (non autodichiarabile).
-- ---------------------------------------------------------------------
create or replace function private.part_listings_reset_system_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.approved_by := null; new.approved_at := null; new.published_at := null; new.expires_at := null;
  new.view_count := 0; new.status_note := null;
  return new;
end;
$$;
create trigger part_listings_a_reset_system_fields before insert on public.part_listings
  for each row execute function private.part_listings_reset_system_fields();

create or replace function private.part_compatibility_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.basis = 'catalogo_produttore' and not private.has_permission('listings.moderate') then
    raise exception 'La corrispondenza con il catalogo del produttore può essere confermata solo dal team AutoGarage24' using errcode = '42501';
  end if;
  if new.year_from is not null and new.year_to is not null and new.year_from > new.year_to then
    raise exception 'Intervallo di anni non valido' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger part_compatibility_guard before insert or update on public.part_compatibility
  for each row execute function private.part_compatibility_guard();

-- ---------------------------------------------------------------------
-- Ricerca ricambi (Fase 7): filtri combinabili, codici OEM/produttore,
-- prefiltro per automobile (marca/modello/anno dichiarati nelle compatibilità)
-- e ordinamento per rilevanza (codice esatto prima). SECURITY INVOKER: valgono le RLS.
-- ---------------------------------------------------------------------
create or replace function public.search_parts(
  p_query text default null, p_category text default null, p_brand text default null, p_code text default null,
  p_make text default null, p_model text default null, p_year integer default null,
  p_condition public.part_condition default null, p_price_min bigint default null, p_price_max bigint default null,
  p_city text default null, p_postal_code text default null, p_seller public.seller_kind default null,
  p_available_only boolean default false, p_sort text default 'recenti', p_limit integer default 12, p_offset integer default 0)
returns table (
  id uuid, slug text, title text, category_slug text, category_name text, manufacturer_brand text, oem_code text,
  manufacturer_code text, condition public.part_condition, price_cents bigint, quantity integer, city text, province text,
  seller_kind public.seller_kind, seller_name text, status public.part_status, published_at timestamptz, cover_path text,
  exact_code boolean, total_count bigint)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select nullif(upper(regexp_replace(coalesce(p_code, p_query, ''), '[^A-Za-z0-9]', '', 'g')), '') as code,
           nullif(lower(trim(p_query)), '') as text
  ), base as (
    select s.*, (q.code is not null and (s.oem_code_norm = q.code or s.manufacturer_code_norm = q.code)) as exact
    from public.part_search s, q
    where s.status in ('pubblicato', 'esaurito')
      and (p_category is null or s.category_slug = p_category
           or s.category_parent_id = (select c.id from public.part_categories c where c.slug = p_category))
      and (p_brand is null or lower(s.manufacturer_brand) = lower(trim(p_brand)))
      and (p_code is null or s.oem_code_norm = q.code or s.manufacturer_code_norm = q.code)
      and (q.text is null or p_code is not null or s.search_text like '%' || q.text || '%'
           or (char_length(q.code) >= 4 and (s.oem_code_norm = q.code or s.manufacturer_code_norm = q.code)))
      and (p_condition is null or s.condition = p_condition)
      and (p_price_min is null or s.price_cents >= p_price_min)
      and (p_price_max is null or s.price_cents <= p_price_max)
      and (p_city is null or lower(s.city) = lower(trim(p_city)))
      and (p_postal_code is null or s.postal_code = trim(p_postal_code))
      and (p_seller is null or s.seller_kind = p_seller)
      and (not p_available_only or (s.status = 'pubblicato' and (s.quantity is null or s.quantity > 0)))
      and (p_make is null or exists (
            select 1 from public.part_compatibility pc
            where pc.part_id = s.id and lower(pc.make_slug) = lower(p_make)
              and (p_model is null or lower(pc.model) = lower(trim(p_model)))
              and (p_year is null or ((pc.year_from is null or pc.year_from <= p_year) and (pc.year_to is null or pc.year_to >= p_year)))))
  )
  select id, slug, title, category_slug, category_name, manufacturer_brand, oem_code, manufacturer_code, condition, price_cents,
         quantity, city, province, seller_kind, seller_name, status, published_at, cover_path, exact, count(*) over ()
  from base
  order by
    case when p_sort = 'rilevanza' then exact end desc nulls last,
    case when p_sort = 'prezzo_asc' then price_cents end asc nulls last,
    case when p_sort = 'prezzo_desc' then price_cents end desc nulls last,
    case when p_sort = 'condizione' then case condition when 'nuovo' then 0 when 'ricondizionato' then 1 else 2 end end asc,
    case when status = 'esaurito' then 1 else 0 end,
    published_at desc
  limit least(greatest(p_limit, 1), 48) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_parts(text, text, text, text, text, text, integer, public.part_condition, bigint, bigint,
  text, text, public.seller_kind, boolean, text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- CMS: le bozze non sono pubbliche. Il sito legge solo i contenuti pubblicati;
-- lo staff con content.manage legge bozze e storico tramite funzione dedicata.
-- ---------------------------------------------------------------------
revoke select on table public.site_content from anon, authenticated;
grant select (key, label, published, published_at) on public.site_content to anon, authenticated;

create or replace function public.admin_content_list()
returns setof public.site_content language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('content.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  return query select * from public.site_content order by key;
end;
$$;
revoke all on function public.admin_content_list() from public, anon;
grant execute on function public.admin_content_list() to authenticated;

-- =====================================================================
-- AutoGarage24 — Migrazione 0020 (Fasi 21, 22, 27)
-- Offerte e coupon, potenziamento marketplace auto (video, verifiche,
-- storico prezzi, impostazioni), prenotazioni di visite e test drive.
-- Riusa: professional_profiles, vehicle_listings, favorites, requests,
-- conversazioni, notifiche, admin_audit_logs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nuovi ruoli professionali (aggiunti in 0019) e permessi
-- ---------------------------------------------------------------------
create or replace function private.is_professional_role(_role public.app_role)
returns boolean language sql immutable set search_path = ''
as $$ select _role in ('officina', 'meccanico', 'venditore_auto', 'venditore_ricambi', 'soccorritore', 'trasportatore',
                       'centro_revisione', 'intermediario_assicurativo') $$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  _meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  _requested     text := _meta ->> 'requested_role';
  _role          public.app_role := 'cliente';
  _full_name     text := nullif(left(trim(_meta ->> 'full_name'), 120), '');
  _business_name text := nullif(left(trim(_meta ->> 'business_name'), 120), '');
  _display_name  text;
begin
  -- "intermediario_assicurativo" e i ruoli dello staff non sono mai assegnabili in registrazione.
  if _requested in ('cliente', 'officina', 'meccanico', 'venditore_auto', 'venditore_ricambi', 'soccorritore', 'trasportatore', 'centro_revisione') then
    _role := _requested::public.app_role;
  end if;
  insert into public.profiles (id, email, full_name, terms_accepted_at, marketing_consent)
  values (new.id, coalesce(new.email, ''), _full_name,
    case when (_meta ->> 'accepted_terms') = 'true' then now() else null end,
    coalesce((_meta ->> 'marketing_consent') = 'true', false));
  insert into public.user_roles (user_id, role) values (new.id, _role);
  if private.is_professional_role(_role) then
    _display_name := coalesce(_business_name, _full_name, 'Professionista');
    if char_length(_display_name) < 2 then _display_name := 'Professionista'; end if;
    insert into public.professional_profiles (user_id, professional_type, display_name, slug)
    values (new.id, _role, _display_name,
      coalesce(nullif(private.slugify(_display_name), ''), 'professionista') || '-' || substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

insert into public.role_permissions (role, permission)
select r::public.app_role, p
  from unnest(array['super_admin', 'admin']) r,
       unnest(array['offers.moderate', 'services.manage', 'insurance.manage', 'valuations.manage', 'bookings.manage', 'business.manage', 'settings.manage']) p
on conflict do nothing;
insert into public.role_permissions (role, permission)
select 'moderatore'::public.app_role, p from unnest(array['offers.moderate', 'bookings.manage', 'valuations.manage']) p
on conflict do nothing;
insert into public.role_permissions (role, permission) values ('operatore_assistenza', 'services.manage') on conflict do nothing;

-- ---------------------------------------------------------------------
-- Impostazioni della piattaforma (configurabili dal pannello)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  key         text primary key check (key ~ '^[a-z0-9_]{3,60}$'),
  value       jsonb not null,
  description text not null,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.platform_settings (key, value, description) values
  ('offers_require_approval', 'true', 'Le offerte dei partner richiedono l''approvazione dello staff prima della pubblicazione'),
  ('private_sellers_enabled', 'true', 'I privati possono pubblicare annunci di automobili'),
  ('valuation_min_comparables', '3', 'Numero minimo di annunci comparabili per produrre una stima interna'),
  ('valuation_km_adjust_per_10k', '0.015', 'Correzione del valore per ogni 10.000 km di differenza rispetto ai comparabili'),
  ('valuation_year_adjust', '0.06', 'Correzione del valore per ogni anno di differenza rispetto ai comparabili'),
  ('valuation_condition_factors', '{"ottime": 1.05, "buone": 1.0, "discrete": 0.9, "da_sistemare": 0.75}', 'Moltiplicatori per le condizioni dichiarate'),
  ('valuation_damage_factor', '0.85', 'Moltiplicatore se l''utente dichiara danni non riparati'),
  ('valuation_spread', '0.08', 'Ampiezza della forchetta minimo/massimo intorno al valore medio');

create or replace function private.setting(_key text)
returns jsonb language sql stable security definer set search_path = ''
as $$ select value from public.platform_settings where key = _key $$;

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from anon, authenticated;
grant select on table public.platform_settings to anon, authenticated;
grant all on table public.platform_settings to service_role;
create policy "platform_settings: lettura" on public.platform_settings for select to anon, authenticated using (true);

create or replace function public.admin_set_setting(setting_key text, setting_value jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare _old jsonb;
begin
  if not private.has_permission('settings.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  select value into _old from public.platform_settings where key = setting_key for update;
  if not found then raise exception 'Impostazione non trovata' using errcode = 'P0002'; end if;
  if jsonb_typeof(setting_value) is distinct from jsonb_typeof(_old) then raise exception 'Tipo di valore non valido' using errcode = '22023'; end if;
  update public.platform_settings set value = setting_value, updated_by = auth.uid(), updated_at = now() where key = setting_key;
  perform private.log_admin_action('setting.changed', 'platform_settings', setting_key, jsonb_build_object('from', _old, 'to', setting_value));
end;
$$;
revoke all on function public.admin_set_setting(text, jsonb) from public, anon;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;

-- =====================================================================
-- FASE 21 — Offerte, coupon, riscatto (richiesta/prenotazione)
-- =====================================================================
create table public.promotional_offers (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.professional_profiles (id) on delete cascade,
  owner_id             uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                text not null check (char_length(title) between 5 and 120),
  description          text not null check (char_length(description) between 20 and 3000),
  category             text not null check (category in ('tagliandi', 'pneumatici', 'freni', 'diagnosi', 'carrozzeria', 'manutenzione',
                                                         'ricambi', 'accessori', 'servizi')),
  neo_dedicated        boolean not null default false,
  neo_topic            text check (neo_topic in ('prima_manutenzione', 'controllo_pre_acquisto', 'pneumatici', 'assistenza', 'accessori', 'altro')),
  image_path           text check (char_length(image_path) <= 400),
  original_price_cents bigint not null check (original_price_cents > 0 and original_price_cents < 10000000000),
  promo_price_cents    bigint not null check (promo_price_cents > 0),
  discount_pct         integer generated always as (round(100 - (promo_price_cents::numeric * 100 / original_price_cents))::integer) stored,
  conditions           text not null check (char_length(conditions) between 10 and 2000),
  starts_on            date not null,
  ends_on              date not null,
  quantity_total       integer check (quantity_total between 1 and 100000),
  quantity_claimed     integer not null default 0,
  city                 text check (char_length(city) <= 80),
  status               text not null default 'bozza' check (status in ('bozza', 'in_revisione', 'pubblicata', 'sospesa', 'rifiutata', 'scaduta', 'esaurita')),
  status_note          text check (char_length(status_note) <= 1000),
  reviewed_by          uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  view_count           integer not null default 0,
  click_count          integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint promotional_offers_price check (promo_price_cents < original_price_cents),
  constraint promotional_offers_dates check (ends_on >= starts_on and ends_on <= starts_on + 366),
  constraint promotional_offers_neo check (neo_dedicated or neo_topic is null)
);
create index promotional_offers_public_idx on public.promotional_offers (status, category, ends_on);
create index promotional_offers_profile_idx on public.promotional_offers (profile_id, status);
create trigger promotional_offers_updated before update on public.promotional_offers for each row execute function private.set_updated_at();

create table public.offer_status_history (
  id         bigint generated always as identity primary key,
  offer_id   uuid not null references public.promotional_offers (id) on delete cascade,
  old_status text, new_status text not null, note text, changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create trigger offer_status_history_immutable before update or delete on public.offer_status_history for each row execute function private.audit_logs_immutable();

-- Regole di scrittura: il partner non decide la pubblicazione né i contatori.
create or replace function private.offers_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _p public.professional_profiles%rowtype; _staff boolean := private.has_permission('offers.moderate');
begin
  -- Aggiornamenti eseguiti dalle funzioni della piattaforma (riscatti, scadenze): già validati lì.
  if tg_op = 'UPDATE' and current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    select * into _p from public.professional_profiles where id = new.profile_id;
    if not found or (_p.user_id <> auth.uid() and not _staff) then raise exception 'Profilo non valido' using errcode = '42501'; end if;
    if _p.professional_type not in ('officina', 'meccanico', 'venditore_auto', 'venditore_ricambi', 'soccorritore', 'centro_revisione', 'trasportatore') then
      raise exception 'Questo tipo di profilo non può pubblicare offerte' using errcode = '42501';
    end if;
    new.owner_id := _p.user_id; new.city := coalesce(new.city, _p.city);
    new.slug := private.unique_slug(left(new.title, 60) || '-' || coalesce(_p.city, 'milano'));
    new.view_count := 0; new.click_count := 0; new.quantity_claimed := 0; new.reviewed_by := null; new.reviewed_at := null;
    if new.status not in ('bozza', 'in_revisione') then new.status := 'bozza'; end if;
  else
    if not _staff then
      new.view_count := old.view_count; new.click_count := old.click_count; new.quantity_claimed := old.quantity_claimed;
      new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at; new.slug := old.slug; new.profile_id := old.profile_id;
      new.owner_id := old.owner_id;
      -- Il partner può: bozza ↔ in revisione, sospendere, riattivare (torna in revisione se serve approvazione).
      if new.status is distinct from old.status then
        if new.status = 'pubblicata' then
          if coalesce((private.setting('offers_require_approval'))::boolean, true) or old.status not in ('sospesa') or old.reviewed_at is null then
            raise exception 'La pubblicazione richiede l''approvazione dello staff' using errcode = '42501';
          end if;
        elsif new.status not in ('bozza', 'in_revisione', 'sospesa') then
          raise exception 'Stato non consentito' using errcode = '42501';
        end if;
      end if;
      -- Modifiche sostanziali a un'offerta pubblicata la rimandano in revisione.
      if old.status = 'pubblicata' and new.status = 'pubblicata'
         and (new.title, new.description, new.original_price_cents, new.promo_price_cents, new.conditions, new.starts_on, new.ends_on, new.category)
             is distinct from (old.title, old.description, old.original_price_cents, old.promo_price_cents, old.conditions, old.starts_on, old.ends_on, old.category) then
        new.status := case when coalesce((private.setting('offers_require_approval'))::boolean, true) then 'in_revisione' else 'pubblicata' end;
      end if;
    end if;
    if new.status = 'in_revisione' and old.status is distinct from 'in_revisione' and not coalesce((private.setting('offers_require_approval'))::boolean, true) then
      -- Approvazione disattivata: pubblicazione diretta dopo i controlli automatici.
      new.status := 'pubblicata';
    end if;
  end if;
  if new.status = 'pubblicata' and new.ends_on < current_date then new.status := 'scaduta'; end if;
  return new;
end;
$$;
create trigger promotional_offers_before_write before insert or update on public.promotional_offers for each row execute function private.offers_before_write();

create or replace function private.offers_after_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.offer_status_history (offer_id, old_status, new_status, note, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, new.status_note, auth.uid());
    if new.status = 'in_revisione' then
      perform private.notify_staff('offers.moderate', 'Offerta da approvare', new.title, '/admin/offerte', 'offer-rev:' || new.id || ':' || now()::date);
    end if;
  end if;
  return null;
end;
$$;
create trigger promotional_offers_after_write after insert or update on public.promotional_offers for each row execute function private.offers_after_write();

create or replace function public.admin_moderate_offer(offer_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _o public.promotional_offers%rowtype;
begin
  if not private.has_permission('offers.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if decision not in ('pubblicata', 'rifiutata', 'sospesa', 'in_revisione') then raise exception 'Decisione non valida' using errcode = '22023'; end if;
  if decision in ('rifiutata', 'sospesa') and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  select * into _o from public.promotional_offers where id = offer_id for update;
  if not found then raise exception 'Offerta non trovata' using errcode = 'P0002'; end if;
  if decision = 'pubblicata' and not private.profile_is_public(_o.profile_id) then
    raise exception 'Il profilo del partner non è pubblico: l''offerta non può essere pubblicata' using errcode = '22023';
  end if;
  update public.promotional_offers set status = decision, status_note = note, reviewed_by = auth.uid(), reviewed_at = now() where id = offer_id;
  perform private.notify(_o.owner_id, 'officine', case decision when 'pubblicata' then 'Offerta pubblicata' when 'rifiutata' then 'Offerta non approvata'
    when 'sospesa' then 'Offerta sospesa' else 'Offerta in revisione' end, _o.title || coalesce(' — ' || note, ''), '/dashboard/offerte', 'offer-mod:' || offer_id || ':' || decision);
  perform private.log_admin_action('offer.' || decision, 'promotional_offers', offer_id::text, jsonb_build_object('note', note));
end;
$$;
revoke all on function public.admin_moderate_offer(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_offer(uuid, text, text) to authenticated;

-- Coupon definiti dal partner (opzionalmente legati a un'offerta).
create table public.promotional_coupons (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.professional_profiles (id) on delete cascade,
  offer_id         uuid references public.promotional_offers (id) on delete cascade,
  code             text not null check (code ~ '^[A-Z0-9-]{4,24}$'),
  discount_type    text not null check (discount_type in ('percentuale', 'importo')),
  discount_value   integer not null check (discount_value > 0),
  max_uses         integer check (max_uses between 1 and 100000),
  uses_count       integer not null default 0,
  per_user_limit   integer not null default 1 check (per_user_limit between 1 and 10),
  min_amount_cents bigint check (min_amount_cents >= 0),
  categories       text[] not null default '{}',
  valid_from       date not null default current_date,
  valid_until      date not null,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint promotional_coupons_pct check (discount_type <> 'percentuale' or discount_value <= 90),
  constraint promotional_coupons_dates check (valid_until >= valid_from),
  constraint promotional_coupons_categories check (categories <@ array['tagliandi', 'pneumatici', 'freni', 'diagnosi', 'carrozzeria', 'manutenzione', 'ricambi', 'accessori', 'servizi'])
);
create unique index promotional_coupons_code_uniq on public.promotional_coupons (upper(code));

create or replace function private.coupons_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and current_setting('ag24.trusted', true) = 'on' then return new; end if;
  new.code := upper(trim(new.code));
  if not private.has_permission('offers.moderate') then
    if not private.owns_profile(new.profile_id) then raise exception 'Profilo non valido' using errcode = '42501'; end if;
    if new.offer_id is not null and not exists (select 1 from public.promotional_offers o where o.id = new.offer_id and o.profile_id = new.profile_id) then
      raise exception 'Offerta non valida' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then new.uses_count := old.uses_count; new.code := old.code; new.profile_id := old.profile_id; else new.uses_count := 0; end if;
  end if;
  return new;
end;
$$;
create trigger promotional_coupons_before_write before insert or update on public.promotional_coupons for each row execute function private.coupons_before_write();

-- Riscatto di un'offerta = richiesta/prenotazione con codice personale (nessun acquisto).
create table public.offer_claims (
  id                 uuid primary key default gen_random_uuid(),
  offer_id           uuid not null references public.promotional_offers (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  claim_code         text not null unique check (claim_code ~ '^AG24-[A-Z0-9]{8}$'),
  coupon_id          uuid references public.promotional_coupons (id) on delete set null,
  estimated_cents    bigint not null check (estimated_cents >= 0),
  status             text not null default 'richiesto' check (status in ('richiesto', 'confermato', 'utilizzato', 'annullato', 'scaduto')),
  message            text check (char_length(message) <= 1000),
  conversation_id    uuid references public.conversations (id) on delete set null,
  confirmed_at       timestamptz,
  used_at            timestamptz,
  created_at         timestamptz not null default now()
);
create unique index offer_claims_active_uniq on public.offer_claims (offer_id, user_id) where status in ('richiesto', 'confermato');
create index offer_claims_user_idx on public.offer_claims (user_id, created_at desc);

create table public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.promotional_coupons (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  claim_id    uuid not null unique references public.offer_claims (id) on delete cascade,
  discount_cents bigint not null check (discount_cents >= 0),
  created_at  timestamptz not null default now()
);
create index coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

-- Validazione del coupon lato server (scadenza, utilizzi, minimo, categoria, limite per utente).
create or replace function private.coupon_discount(_c public.promotional_coupons, _o public.promotional_offers, _user uuid)
returns bigint language plpgsql stable security definer set search_path = ''
as $$
begin
  if not _c.active or current_date < _c.valid_from or current_date > _c.valid_until then raise exception 'Il codice non è valido o è scaduto' using errcode = '22023'; end if;
  if _c.profile_id <> _o.profile_id or (_c.offer_id is not null and _c.offer_id <> _o.id) then raise exception 'Il codice non vale per questa offerta' using errcode = '22023'; end if;
  if cardinality(_c.categories) > 0 and not (_o.category = any(_c.categories)) then raise exception 'Il codice non vale per questa categoria' using errcode = '22023'; end if;
  if _c.max_uses is not null and _c.uses_count >= _c.max_uses then raise exception 'Il codice ha raggiunto il numero massimo di utilizzi' using errcode = '22023'; end if;
  if _c.min_amount_cents is not null and _o.promo_price_cents < _c.min_amount_cents then raise exception 'Importo minimo non raggiunto per questo codice' using errcode = '22023'; end if;
  if (select count(*) from public.coupon_redemptions r join public.offer_claims cl on cl.id = r.claim_id
       where r.coupon_id = _c.id and r.user_id = _user and cl.status <> 'annullato') >= _c.per_user_limit then
    raise exception 'Hai già usato questo codice' using errcode = '23505';
  end if;
  return least(_o.promo_price_cents, case _c.discount_type when 'percentuale' then round(_o.promo_price_cents * _c.discount_value / 100.0)::bigint else _c.discount_value::bigint * 100 end);
end;
$$;

create or replace function public.claim_offer(offer_id uuid, coupon_code text default null, message text default null)
returns table (claim_id uuid, claim_code text, estimated_cents bigint)
language plpgsql security definer set search_path = ''
as $$
declare _o public.promotional_offers%rowtype; _c public.promotional_coupons%rowtype; _disc bigint := 0; _id uuid; _code text; _conv uuid; _owner uuid;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per richiedere l''offerta' using errcode = '42501'; end if;
  perform set_config('ag24.trusted', 'on', true);
  perform private.enforce_rate_limit('offer_claim', 10, interval '1 day');
  select * into _o from public.promotional_offers where id = offer_id for update;
  if not found or _o.status <> 'pubblicata' then raise exception 'Offerta non disponibile' using errcode = 'P0002'; end if;
  if current_date < _o.starts_on then raise exception 'L''offerta non è ancora attiva' using errcode = '22023'; end if;
  if current_date > _o.ends_on then
    update public.promotional_offers set status = 'scaduta' where id = _o.id;
    raise exception 'L''offerta è scaduta' using errcode = '22023';
  end if;
  if _o.owner_id = auth.uid() then raise exception 'Non puoi richiedere una tua offerta' using errcode = '22023'; end if;
  if _o.quantity_total is not null and _o.quantity_claimed >= _o.quantity_total then raise exception 'Offerta esaurita' using errcode = '22023'; end if;
  if exists (select 1 from public.offer_claims x where x.offer_id = _o.id and x.user_id = auth.uid() and x.status in ('richiesto', 'confermato')) then
    raise exception 'Hai già una richiesta attiva per questa offerta' using errcode = '23505';
  end if;
  if coalesce(trim(coupon_code), '') <> '' then
    select * into _c from public.promotional_coupons where upper(code) = upper(trim(coupon_code)) for update;
    if not found then raise exception 'Codice non valido' using errcode = '22023'; end if;
    _disc := private.coupon_discount(_c, _o, auth.uid());
  end if;
  loop
    _code := 'AG24-' || upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
    exit when char_length(_code) = 13 and not exists (select 1 from public.offer_claims x where x.claim_code = _code);
  end loop;
  -- Conversazione con il partner, collegata all'offerta (una sola per contesto).
  select user_id into _owner from public.professional_profiles where id = _o.profile_id;
  insert into public.conversations (context, subject, professional_profile_id, created_by)
  values ('generale', left('Offerta: ' || _o.title, 200), _o.profile_id, auth.uid()) returning id into _conv;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at) values (_conv, auth.uid(), now()), (_conv, _owner, null);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (_conv, auth.uid(), 'sistema', 'Richiesta per l''offerta «' || _o.title || '» — codice ' || _code ||
          '. Nessun pagamento avviene su AutoGarage24: il partner confermerà disponibilità e condizioni.' || coalesce(E'\n' || nullif(trim(message), ''), ''));
  insert into public.offer_claims (offer_id, user_id, claim_code, coupon_id, estimated_cents, message, conversation_id)
  values (_o.id, auth.uid(), _code, _c.id, _o.promo_price_cents - _disc, nullif(trim(message), ''), _conv) returning id into _id;
  if _c.id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, claim_id, discount_cents) values (_c.id, auth.uid(), _id, _disc);
    update public.promotional_coupons set uses_count = uses_count + 1 where id = _c.id;
  end if;
  update public.promotional_offers set quantity_claimed = quantity_claimed + 1,
         status = case when quantity_total is not null and quantity_claimed + 1 >= quantity_total then 'esaurita' else status end
   where id = _o.id;
  perform private.notify(_owner, 'officine', 'Nuova richiesta per un''offerta', _o.title, '/dashboard/offerte?tab=richieste', 'claim:' || _id);
  perform set_config('ag24.trusted', 'off', true);
  return query select _id, _code, _o.promo_price_cents - _disc;
end;
$$;
revoke all on function public.claim_offer(uuid, text, text) from public, anon;
grant execute on function public.claim_offer(uuid, text, text) to authenticated;

-- Conferma/uso da parte del partner (riscatto verificato) o annullamento del cliente.
create or replace function public.update_offer_claim(claim_id uuid, new_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _cl public.offer_claims%rowtype; _o public.promotional_offers%rowtype; _partner boolean;
begin
  select * into _cl from public.offer_claims where id = claim_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  select * into _o from public.promotional_offers where id = _cl.offer_id;
  _partner := _o.owner_id = auth.uid();
  perform set_config('ag24.trusted', 'on', true);
  if not _partner and _cl.user_id <> auth.uid() then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  if _cl.status in ('utilizzato', 'annullato', 'scaduto') then raise exception 'La richiesta è chiusa' using errcode = '22023'; end if;
  if new_status = 'annullato' then
    null; -- entrambe le parti possono annullare
  elsif new_status in ('confermato', 'utilizzato') and _partner then
    if new_status = 'utilizzato' and _cl.status <> 'confermato' then raise exception 'Conferma prima la richiesta' using errcode = '22023'; end if;
  else
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  update public.offer_claims set status = new_status,
         confirmed_at = case when new_status = 'confermato' then now() else confirmed_at end,
         used_at = case when new_status = 'utilizzato' then now() else used_at end
   where id = claim_id;
  if new_status = 'annullato' then
    update public.promotional_offers set quantity_claimed = greatest(quantity_claimed - 1, 0),
           status = case when status = 'esaurita' then 'pubblicata' else status end where id = _o.id;
    update public.promotional_coupons c set uses_count = greatest(uses_count - 1, 0)
      from public.coupon_redemptions r where r.claim_id = _cl.id and c.id = r.coupon_id;
  end if;
  perform private.notify(case when _partner then _cl.user_id else _o.owner_id end, 'officine',
    'Offerta: richiesta ' || replace(new_status, '_', ' '), _o.title, case when _partner then '/dashboard/le-mie-offerte' else '/dashboard/offerte?tab=richieste' end,
    'claim:' || claim_id || ':' || new_status);
  perform set_config('ag24.trusted', 'off', true);
end;
$$;
revoke all on function public.update_offer_claim(uuid, text) from public, anon;
grant execute on function public.update_offer_claim(uuid, text) to authenticated;

create or replace function public.track_offer(offer_slug text, is_click boolean default false)
returns void language sql security definer set search_path = ''
as $$
  select set_config('ag24.trusted', 'on', true);
  update public.promotional_offers set view_count = view_count + case when is_click then 0 else 1 end,
         click_count = click_count + case when is_click then 1 else 0 end
   where slug = offer_slug and status = 'pubblicata';
  select set_config('ag24.trusted', 'off', true);
$$;
grant execute on function public.track_offer(text, boolean) to anon, authenticated;

-- Ricerca geografica (integrata con la mappa della Fase 19): posizione del partner (zona se privata).
create or replace function public.search_offers(p_lat double precision default null, p_lng double precision default null, p_radius_km integer default 25,
  p_city text default null, p_category text default null, p_neo boolean default false, p_limit integer default 60)
returns table (id uuid, slug text, title text, category text, neo_topic text, image_path text, original_price_cents bigint, promo_price_cents bigint,
               discount_pct integer, ends_on date, city text, partner_name text, partner_slug text, partner_type public.app_role, distance_km numeric,
               quantity_left integer)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.slug, o.title, o.category, o.neo_topic, o.image_path, o.original_price_cents, o.promo_price_cents, o.discount_pct, o.ends_on,
         coalesce(o.city, p.city), p.display_name, p.slug, p.professional_type,
         case when p_lat is not null and p_lng is not null and p.latitude is not null
              then round(private.distance_km(p_lat, p_lng, round(p.latitude::numeric, 2)::float8, round(p.longitude::numeric, 2)::float8)::numeric, 1) end,
         case when o.quantity_total is not null then o.quantity_total - o.quantity_claimed end
    from public.promotional_offers o join public.professional_profiles p on p.id = o.profile_id
   where o.status = 'pubblicata' and current_date between o.starts_on and o.ends_on and private.profile_is_public(p.id)
     and (p_category is null or o.category = p_category)
     and (not coalesce(p_neo, false) or o.neo_dedicated)
     and (case when p_lat is not null and p_lng is not null
               then p.latitude is not null and private.distance_km(p_lat, p_lng, p.latitude, p.longitude) <= least(greatest(coalesce(p_radius_km, 25), 1), 200)
               else (p_city is null or lower(coalesce(o.city, p.city)) = lower(trim(p_city))) end)
   order by o.neo_dedicated desc, 15 nulls last, o.discount_pct desc, o.ends_on
   limit least(greatest(coalesce(p_limit, 60), 1), 200)
$$;
grant execute on function public.search_offers(double precision, double precision, integer, text, text, boolean, integer) to anon, authenticated;

-- Scadenza automatica (job giornaliero).
create or replace function private.expire_offers()
returns void language sql security definer set search_path = ''
as $$
  select set_config('ag24.trusted', 'on', true);
  update public.promotional_offers set status = 'scaduta' where status in ('pubblicata', 'in_revisione', 'sospesa') and ends_on < current_date;
  update public.offer_claims c set status = 'scaduto' from public.promotional_offers o
   where o.id = c.offer_id and c.status in ('richiesto', 'confermato') and o.ends_on < current_date - 30;
  select set_config('ag24.trusted', 'off', true);
$$;

-- Statistiche per il partner (dati reali, nessuna confusione tra viste, richieste e utilizzi).
create or replace function public.offer_stats(profile_id uuid)
returns table (offer_id uuid, title text, status text, views integer, clicks integer, claims bigint, confirmed bigint, used bigint, coupons_used bigint)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.title, o.status, o.view_count, o.click_count,
         (select count(*) from public.offer_claims c where c.offer_id = o.id),
         (select count(*) from public.offer_claims c where c.offer_id = o.id and c.status in ('confermato', 'utilizzato')),
         (select count(*) from public.offer_claims c where c.offer_id = o.id and c.status = 'utilizzato'),
         (select count(*) from public.coupon_redemptions r join public.offer_claims c on c.id = r.claim_id where c.offer_id = o.id)
    from public.promotional_offers o
   where o.profile_id = offer_stats.profile_id and (private.owns_profile(offer_stats.profile_id) or private.has_permission('offers.moderate'))
   order by o.created_at desc
$$;
revoke all on function public.offer_stats(uuid) from public, anon;
grant execute on function public.offer_stats(uuid) to authenticated;

-- Preferiti: si riusa la tabella favorites.
alter table public.favorites add column offer_id uuid references public.promotional_offers (id) on delete cascade;
alter table public.favorites drop constraint if exists favorites_check;
alter table public.favorites add constraint favorites_one_target check (num_nonnulls(listing_id, professional_profile_id, part_id, offer_id) = 1);
create unique index favorites_user_offer_uniq on public.favorites (user_id, offer_id) where offer_id is not null;

-- RLS
alter table public.promotional_offers enable row level security;
alter table public.offer_status_history enable row level security;
alter table public.promotional_coupons enable row level security;
alter table public.offer_claims enable row level security;
alter table public.coupon_redemptions enable row level security;
revoke all on table public.promotional_offers, public.offer_status_history, public.promotional_coupons, public.offer_claims, public.coupon_redemptions from anon, authenticated;
grant all on table public.promotional_offers, public.offer_status_history, public.promotional_coupons, public.offer_claims, public.coupon_redemptions to service_role;
grant select on table public.promotional_offers to anon, authenticated;
grant insert, update, delete on table public.promotional_offers to authenticated;
grant select, insert, update, delete on table public.promotional_coupons to authenticated;
grant select on table public.offer_claims, public.coupon_redemptions, public.offer_status_history to authenticated;

create policy "offers: pubbliche" on public.promotional_offers for select to anon, authenticated
  using (status = 'pubblicata' and current_date between starts_on and ends_on);
create policy "offers: partner" on public.promotional_offers for select to authenticated using (owner_id = (select auth.uid()));
create policy "offers: staff" on public.promotional_offers for select to authenticated using ((select private.has_permission('offers.moderate')));
create policy "offers: creazione" on public.promotional_offers for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "offers: modifica partner" on public.promotional_offers for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.has_permission('offers.moderate')))
  with check (owner_id = (select auth.uid()) or (select private.has_permission('offers.moderate')));
create policy "offers: eliminazione bozze" on public.promotional_offers for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('bozza', 'rifiutata') and quantity_claimed = 0);
create policy "offer history: partner e staff" on public.offer_status_history for select to authenticated
  using (exists (select 1 from public.promotional_offers o where o.id = offer_id and o.owner_id = (select auth.uid())) or (select private.has_permission('offers.moderate')));
create policy "coupons: partner" on public.promotional_coupons for all to authenticated
  using ((select private.owns_profile(profile_id)) or (select private.has_permission('offers.moderate')))
  with check ((select private.owns_profile(profile_id)) or (select private.has_permission('offers.moderate')));
create policy "claims: cliente" on public.offer_claims for select to authenticated using (user_id = (select auth.uid()));
create policy "claims: partner" on public.offer_claims for select to authenticated
  using (exists (select 1 from public.promotional_offers o where o.id = offer_id and o.owner_id = (select auth.uid())));
create policy "claims: staff" on public.offer_claims for select to authenticated using ((select private.has_permission('offers.moderate')));
create policy "redemptions: parti e staff" on public.coupon_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('offers.moderate'))
         or exists (select 1 from public.promotional_coupons c where c.id = coupon_id and private.owns_profile(c.profile_id)));
-- Segnalazioni: le offerte rientrano nelle segnalazioni esistenti.
alter table public.content_reports drop constraint if exists content_reports_target_type_check;
alter table public.content_reports add constraint content_reports_target_type_check check (target_type in (
  'annuncio_auto', 'ricambio', 'profilo', 'recensione', 'messaggio', 'utente', 'offerta', 'operatore', 'trasporto', 'valutazione', 'altro'));

-- =====================================================================
-- FASE 22 — Marketplace auto: video, verifiche documentate, storico prezzi,
-- notifiche ai preferiti, privati abilitabili, ricerca per distanza.
-- =====================================================================
create table public.vehicle_videos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.vehicle_listings (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 400),
  mime_type    text not null check (mime_type in ('video/mp4', 'video/webm', 'video/quicktime')),
  size_bytes   integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index vehicle_videos_listing_idx on public.vehicle_videos (listing_id, position);
create or replace function private.vehicle_videos_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.owns_listing(new.listing_id) then raise exception 'Annuncio non valido' using errcode = '42501'; end if;
  if split_part(new.storage_path, '/', 1) <> auth.uid()::text then raise exception 'Percorso non valido' using errcode = '42501'; end if;
  if (select count(*) from public.vehicle_videos v where v.listing_id = new.listing_id) >= 3 then raise exception 'Massimo 3 video per annuncio' using errcode = '22023'; end if;
  return new;
end;
$$;
create trigger vehicle_videos_guard before insert on public.vehicle_videos for each row execute function private.vehicle_videos_guard();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-videos', 'listing-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "listing-videos: caricamento nella propria cartella" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing-videos: eliminazione propria" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Verifiche documentate: solo lo staff le registra, con evidenza. Nessuna verifica = nessun badge.
create table public.vehicle_verifications (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.vehicle_listings (id) on delete cascade,
  kind          text not null check (kind in ('documentazione', 'identita_venditore', 'dati_tecnici')),
  evidence      text not null check (char_length(evidence) between 10 and 1000),
  verified_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  verified_at   timestamptz not null default now(),
  revoked_at    timestamptz,
  revoke_reason text check (char_length(revoke_reason) <= 500)
);
create unique index vehicle_verifications_active_uniq on public.vehicle_verifications (listing_id, kind) where revoked_at is null;

create or replace function public.admin_verify_listing(listing_id uuid, kind text, evidence text, revoke boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('listings.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if kind not in ('documentazione', 'identita_venditore', 'dati_tecnici') then raise exception 'Tipo non valido' using errcode = '22023'; end if;
  if coalesce(char_length(trim(evidence)), 0) < 10 then raise exception 'Descrivi l''evidenza o il motivo (almeno 10 caratteri)' using errcode = '22023'; end if;
  if revoke then
    update public.vehicle_verifications v set revoked_at = now(), revoke_reason = evidence
     where v.listing_id = admin_verify_listing.listing_id and v.kind = admin_verify_listing.kind and v.revoked_at is null;
  else
    insert into public.vehicle_verifications (listing_id, kind, evidence) values (admin_verify_listing.listing_id, admin_verify_listing.kind, trim(evidence));
  end if;
  perform private.log_admin_action(case when revoke then 'listing.verification_revoked' else 'listing.verified' end, 'vehicle_listings', listing_id::text,
    jsonb_build_object('kind', kind, 'evidence', evidence));
end;
$$;
revoke all on function public.admin_verify_listing(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_verify_listing(uuid, text, text, boolean) to authenticated;

-- Storico prezzi e avviso a chi ha salvato l'annuncio.
create table public.vehicle_price_history (
  id          bigint generated always as identity primary key,
  listing_id  uuid not null references public.vehicle_listings (id) on delete cascade,
  old_cents   bigint, new_cents bigint,
  changed_at  timestamptz not null default now()
);
create index vehicle_price_history_idx on public.vehicle_price_history (listing_id, changed_at);
create or replace function private.listing_watch_changes()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _u uuid; _title text; _body text;
begin
  if new.price_cents is distinct from old.price_cents and old.price_cents is not null then
    insert into public.vehicle_price_history (listing_id, old_cents, new_cents) values (new.id, old.price_cents, new.price_cents);
  end if;
  if old.status = 'pubblicato' and (new.price_cents is distinct from old.price_cents or new.status in ('venduto', 'sospeso', 'scaduto')) then
    _title := case when new.status = 'venduto' then 'Auto salvata venduta' when new.status in ('sospeso', 'scaduto') then 'Auto salvata non più disponibile'
                   when new.price_cents < old.price_cents then 'Prezzo ridotto su un''auto salvata' else 'Prezzo modificato su un''auto salvata' end;
    _body := new.title || case when new.price_cents is distinct from old.price_cents and new.status = 'pubblicato'
                               then ' — da € ' || to_char(old.price_cents / 100.0, 'FM999G999') || ' a € ' || to_char(new.price_cents / 100.0, 'FM999G999') else '' end;
    for _u in select f.user_id from public.favorites f where f.listing_id = new.id loop
      perform private.notify(_u, 'automobili', _title, _body, '/auto/' || new.slug, 'watch:' || new.id || ':' || coalesce(new.price_cents, 0) || ':' || new.status);
    end loop;
  end if;
  return null;
end;
$$;
create trigger vehicle_listings_watch after update of price_cents, status on public.vehicle_listings for each row execute function private.listing_watch_changes();

-- Privati: pubblicazione abilitabile dallo staff.
create or replace function private.listing_private_sellers_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.seller_kind = 'privato' and not coalesce((private.setting('private_sellers_enabled'))::boolean, true) and not private.is_staff() then
    raise exception 'La pubblicazione di annunci da parte di privati è temporaneamente disattivata' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger vehicle_listings_private_guard before insert on public.vehicle_listings for each row execute function private.listing_private_sellers_guard();

-- Ricerca per distanza: identificativi degli annunci entro il raggio (posizione arrotondata).
create or replace function public.listings_within(p_lat double precision, p_lng double precision, p_radius_km integer)
returns table (listing_id uuid, distance_km numeric)
language sql stable security definer set search_path = ''
as $$
  select l.id, round(private.distance_km(p_lat, p_lng, round(l.latitude::numeric, 2)::float8, round(l.longitude::numeric, 2)::float8)::numeric, 1)
    from public.vehicle_listings l
   where l.status = 'pubblicato' and l.latitude is not null
     and private.distance_km(p_lat, p_lng, l.latitude, l.longitude) <= least(greatest(coalesce(p_radius_km, 25), 1), 300)
   limit 2000
$$;
grant execute on function public.listings_within(double precision, double precision, integer) to anon, authenticated;

-- Statistiche venditore (solo propri annunci).
create or replace function public.seller_listing_stats()
returns table (listing_id uuid, title text, slug text, status public.listing_status, views integer, favorites bigint, requests bigint, bookings bigint, price_changes bigint)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.title, l.slug, l.status, l.view_count,
         (select count(*) from public.favorites f where f.listing_id = l.id),
         (select count(*) from public.requests r where r.listing_id = l.id),
         0::bigint,
         (select count(*) from public.vehicle_price_history h where h.listing_id = l.id)
    from public.vehicle_listings l where l.owner_id = auth.uid() order by l.created_at desc
$$;
revoke all on function public.seller_listing_stats() from public, anon;
grant execute on function public.seller_listing_stats() to authenticated;

alter table public.vehicle_videos enable row level security;
alter table public.vehicle_verifications enable row level security;
alter table public.vehicle_price_history enable row level security;
revoke all on table public.vehicle_videos, public.vehicle_verifications, public.vehicle_price_history from anon, authenticated;
grant all on table public.vehicle_videos, public.vehicle_verifications, public.vehicle_price_history to service_role;
grant select on table public.vehicle_videos, public.vehicle_verifications, public.vehicle_price_history to anon, authenticated;
grant insert, delete on table public.vehicle_videos to authenticated;
create policy "vehicle_videos: pubbliche" on public.vehicle_videos for select to anon, authenticated
  using ((select private.listing_is_public(listing_id)) or (select private.owns_listing(listing_id)) or (select private.is_staff()));
create policy "vehicle_videos: proprietario" on public.vehicle_videos for insert to authenticated with check ((select private.owns_listing(listing_id)));
create policy "vehicle_videos: eliminazione" on public.vehicle_videos for delete to authenticated using ((select private.owns_listing(listing_id)));
create policy "vehicle_verifications: lettura" on public.vehicle_verifications for select to anon, authenticated
  using ((select private.listing_is_public(listing_id)) or (select private.owns_listing(listing_id)) or (select private.is_staff()));
create policy "vehicle_price_history: lettura" on public.vehicle_price_history for select to anon, authenticated
  using ((select private.listing_is_public(listing_id)) or (select private.owns_listing(listing_id)) or (select private.is_staff()));

-- =====================================================================
-- FASE 27 — Prenotazioni di visite e test drive con disponibilità reali
-- =====================================================================
create table public.booking_settings (
  owner_id              uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  slot_minutes          integer not null default 45 check (slot_minutes in (15, 20, 30, 45, 60, 90, 120)),
  min_notice_hours      integer not null default 12 check (min_notice_hours between 0 and 168),
  max_days_ahead        integer not null default 30 check (max_days_ahead between 1 and 120),
  test_drive_enabled    boolean not null default true,
  test_drive_min_years  integer check (test_drive_min_years between 0 and 30),
  test_drive_conditions text check (char_length(test_drive_conditions) <= 2000),
  meeting_address       text check (char_length(meeting_address) <= 200),
  timezone              text not null default 'Europe/Rome' check (timezone = 'Europe/Rome'),
  updated_at            timestamptz not null default now()
);

create table public.booking_availability (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  weekday     integer not null check (weekday between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index booking_availability_owner_idx on public.booking_availability (owner_id, weekday);

create table public.booking_blocks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 200),
  check (ends_at > starts_at)
);
create index booking_blocks_owner_idx on public.booking_blocks (owner_id, starts_at);

create table public.vehicle_bookings (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.vehicle_listings (id) on delete cascade,
  buyer_id            uuid not null references public.profiles (id) on delete cascade,
  seller_id           uuid not null references public.profiles (id) on delete cascade,
  request_id          uuid references public.requests (id) on delete set null,
  kind                text not null check (kind in ('visione', 'test_drive', 'visione_test_drive', 'concessionario', 'luogo_concordato')),
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  alt_starts_at       timestamptz,
  proposed_starts_at  timestamptz,
  status              text not null default 'in_attesa' check (status in ('in_attesa', 'confermato', 'modifica_proposta', 'rifiutato', 'annullato',
                                                                       'completato', 'mancata_presentazione')),
  message             text check (char_length(message) <= 1000),
  contact_phone       text check (contact_phone ~ '^[0-9 +().-]{6,30}$'),
  license_confirmed   boolean not null default false,
  driving_years       integer check (driving_years between 0 and 70),
  conditions_accepted boolean not null default false,
  decision_note       text check (char_length(decision_note) <= 500),
  reminded_24h        boolean not null default false,
  reminded_2h         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (ends_at > starts_at),
  check (buyer_id <> seller_id),
  constraint vehicle_bookings_test_drive check (kind not in ('test_drive', 'visione_test_drive') or (license_confirmed and conditions_accepted))
);
create index vehicle_bookings_seller_idx on public.vehicle_bookings (seller_id, starts_at);
create index vehicle_bookings_buyer_idx on public.vehicle_bookings (buyer_id, starts_at);
-- Nessuna doppia conferma sullo stesso orario per lo stesso venditore.
create unique index vehicle_bookings_confirmed_uniq on public.vehicle_bookings (seller_id, starts_at) where status = 'confermato';
create trigger vehicle_bookings_updated before update on public.vehicle_bookings for each row execute function private.set_updated_at();

create table public.vehicle_booking_events (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.vehicle_bookings (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  event       text not null check (char_length(event) <= 60),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index vehicle_booking_events_idx on public.vehicle_booking_events (booking_id, created_at);
create trigger vehicle_booking_events_immutable before update or delete on public.vehicle_booking_events for each row execute function private.audit_logs_immutable();

-- Collegamento facoltativo a Google Calendar: SOLO predisposto, nessuna sincronizzazione attiva.
create table public.calendar_connections (
  owner_id     uuid primary key references public.profiles (id) on delete cascade,
  provider     text not null default 'google' check (provider = 'google'),
  status       text not null default 'non_configurato' check (status in ('non_configurato', 'in_attesa_autorizzazione', 'attivo', 'errore', 'revocato')),
  calendar_id  text check (char_length(calendar_id) <= 200),
  last_error   text check (char_length(last_error) <= 500),
  updated_at   timestamptz not null default now()
);

-- Orari prenotabili calcolati SOLO dalle disponibilità configurate dal venditore (fuso Europe/Rome).
create or replace function public.booking_slots(listing_id uuid, from_date date default null, days integer default 14)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare _l public.vehicle_listings%rowtype; _s public.booking_settings%rowtype; _d date; _a record; _t timestamp; _start timestamptz;
        _first date := coalesce(from_date, (now() at time zone 'Europe/Rome')::date);
begin
  select * into _l from public.vehicle_listings where id = listing_id;
  if not found or _l.status <> 'pubblicato' then return; end if;
  select * into _s from public.booking_settings where owner_id = _l.owner_id;
  if not found then return; end if;
  for _d in select generate_series(_first, _first + least(greatest(days, 1), _s.max_days_ahead) - 1, interval '1 day')::date loop
    for _a in select * from public.booking_availability where owner_id = _l.owner_id and weekday = extract(isodow from _d) order by start_time loop
      _t := _d + _a.start_time;
      while _t + make_interval(mins => _s.slot_minutes) <= _d + _a.end_time loop
        _start := _t at time zone 'Europe/Rome';
        if _start >= now() + make_interval(hours => _s.min_notice_hours)
           and _start <= now() + make_interval(days => _s.max_days_ahead)
           and not exists (select 1 from public.booking_blocks b where b.owner_id = _l.owner_id
                            and tstzrange(b.starts_at, b.ends_at) && tstzrange(_start, _start + make_interval(mins => _s.slot_minutes)))
           and not exists (select 1 from public.vehicle_bookings vb where vb.seller_id = _l.owner_id and vb.status in ('confermato', 'in_attesa', 'modifica_proposta')
                            and tstzrange(vb.starts_at, vb.ends_at) && tstzrange(_start, _start + make_interval(mins => _s.slot_minutes))) then
          starts_at := _start; ends_at := _start + make_interval(mins => _s.slot_minutes);
          return next;
        end if;
        _t := _t + make_interval(mins => _s.slot_minutes);
      end loop;
    end loop;
  end loop;
end;
$$;
grant execute on function public.booking_slots(uuid, date, integer) to anon, authenticated;

create or replace function private.slot_is_free(_seller uuid, _start timestamptz, _end timestamptz, _exclude uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.vehicle_bookings vb where vb.seller_id = _seller and vb.id is distinct from _exclude
                      and vb.status in ('confermato', 'in_attesa', 'modifica_proposta') and tstzrange(vb.starts_at, vb.ends_at) && tstzrange(_start, _end))
     and not exists (select 1 from public.booking_blocks b where b.owner_id = _seller and tstzrange(b.starts_at, b.ends_at) && tstzrange(_start, _end))
$$;

create or replace function private.booking_message(_b public.vehicle_bookings, _text text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _conv uuid;
begin
  select conversation_id into _conv from public.requests where id = _b.request_id;
  if _conv is not null then
    insert into public.messages (conversation_id, sender_id, kind, body) values (_conv, auth.uid(), 'sistema', left(_text, 4000));
  end if;
end;
$$;

create or replace function public.create_booking(listing_id uuid, kind text, starts_at timestamptz, alt_starts_at timestamptz default null,
  message text default null, contact_phone text default null, license_confirmed boolean default false, driving_years integer default null,
  conditions_accepted boolean default false)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _l public.vehicle_listings%rowtype; _s public.booking_settings%rowtype; _req uuid; _id uuid; _end timestamptz; _b public.vehicle_bookings%rowtype;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per prenotare' using errcode = '42501'; end if;
  perform private.enforce_rate_limit('booking', 6, interval '1 day');
  select * into _l from public.vehicle_listings where id = create_booking.listing_id;
  if not found or _l.status <> 'pubblicato' then raise exception 'Annuncio non disponibile' using errcode = 'P0002'; end if;
  if _l.owner_id = auth.uid() then raise exception 'Non puoi prenotare la tua auto' using errcode = '22023'; end if;
  select * into _s from public.booking_settings where owner_id = _l.owner_id;
  if not found then raise exception 'Il venditore non ha ancora indicato le proprie disponibilità: contattalo con un messaggio' using errcode = '22023'; end if;
  if kind in ('test_drive', 'visione_test_drive') then
    if not _s.test_drive_enabled then raise exception 'Il venditore non offre test drive' using errcode = '22023'; end if;
    if not coalesce(license_confirmed, false) or not coalesce(conditions_accepted, false) then
      raise exception 'Per il test drive conferma la patente valida e accetta le condizioni' using errcode = '22023';
    end if;
    if _s.test_drive_min_years is not null and coalesce(driving_years, -1) < _s.test_drive_min_years then
      raise exception 'Il venditore richiede almeno % anni di esperienza di guida', _s.test_drive_min_years using errcode = '22023';
    end if;
  end if;
  -- Serializza le prenotazioni dello stesso venditore (richieste simultanee).
  perform pg_advisory_xact_lock(hashtext('booking:' || _l.owner_id::text));
  if not exists (select 1 from public.booking_slots(create_booking.listing_id, (create_booking.starts_at at time zone 'Europe/Rome')::date, 1) s
                  where s.starts_at = create_booking.starts_at) then
    raise exception 'L''orario scelto non è più disponibile' using errcode = '23P01';
  end if;
  if alt_starts_at is not null and not exists (select 1 from public.booking_slots(create_booking.listing_id, (create_booking.alt_starts_at at time zone 'Europe/Rome')::date, 1) s
                  where s.starts_at = create_booking.alt_starts_at) then
    raise exception 'L''orario alternativo non è disponibile' using errcode = '23P01';
  end if;
  if exists (select 1 from public.vehicle_bookings vb where vb.listing_id = _l.id and vb.buyer_id = auth.uid() and vb.status in ('in_attesa', 'confermato', 'modifica_proposta')) then
    raise exception 'Hai già una prenotazione attiva per questa auto' using errcode = '23505';
  end if;
  _end := starts_at + make_interval(mins => _s.slot_minutes);
  -- Conversazione: si riusa la richiesta aperta sull'annuncio, altrimenti se ne crea una (nessun duplicato).
  select r.id into _req from public.requests r where r.requester_id = auth.uid() and r.listing_id = _l.id
     and r.kind in ('info_auto', 'appuntamento_auto') and r.status not in ('completata', 'annullata', 'rifiutata') order by r.created_at desc limit 1;
  if _req is null then
    insert into public.requests (kind, requester_id, listing_id, subject, message, preferred_date, contact_preference)
    values ('appuntamento_auto', auth.uid(), _l.id, left('Prenotazione: ' || _l.title, 200),
            'Richiesta di ' || replace(kind, '_', ' ') || coalesce(E'\n' || nullif(trim(message), ''), ''), (starts_at at time zone 'Europe/Rome')::date, 'messaggio')
    returning id into _req;
  end if;
  insert into public.vehicle_bookings (listing_id, buyer_id, seller_id, request_id, kind, starts_at, ends_at, alt_starts_at, message, contact_phone,
                                       license_confirmed, driving_years, conditions_accepted)
  values (_l.id, auth.uid(), _l.owner_id, _req, kind, starts_at, _end, alt_starts_at, nullif(trim(message), ''), nullif(trim(contact_phone), ''),
          coalesce(license_confirmed, false), driving_years, coalesce(conditions_accepted, false))
  returning * into _b;
  insert into public.vehicle_booking_events (booking_id, actor_id, event, data) values (_b.id, auth.uid(), 'creata', jsonb_build_object('starts_at', starts_at, 'kind', kind));
  perform private.booking_message(_b, 'Nuova prenotazione (' || replace(kind, '_', ' ') || ') per il ' ||
    to_char(starts_at at time zone 'Europe/Rome', 'DD/MM/YYYY "alle" HH24:MI') || '. In attesa di conferma del venditore.');
  perform private.notify(_l.owner_id, 'appuntamenti', 'Nuova richiesta di appuntamento', _l.title || ' — ' || to_char(starts_at at time zone 'Europe/Rome', 'DD/MM HH24:MI'),
    '/dashboard/prenotazioni?vista=venditore', 'booking:' || _b.id);
  return _b.id;
end;
$$;
revoke all on function public.create_booking(uuid, text, timestamptz, timestamptz, text, text, boolean, integer, boolean) from public, anon;
grant execute on function public.create_booking(uuid, text, timestamptz, timestamptz, text, text, boolean, integer, boolean) to authenticated;

-- Transizioni di stato (lato server, atomiche).
create or replace function public.respond_booking(booking_id uuid, action text, new_starts_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _b public.vehicle_bookings%rowtype; _uid uuid := auth.uid(); _seller boolean; _new text; _len interval; _other uuid; _title text;
begin
  select * into _b from public.vehicle_bookings where id = booking_id for update;
  if not found or _uid not in (_b.buyer_id, _b.seller_id) then raise exception 'Prenotazione non trovata' using errcode = 'P0002'; end if;
  _seller := _uid = _b.seller_id; _len := _b.ends_at - _b.starts_at; _other := case when _seller then _b.buyer_id else _b.seller_id end;
  perform pg_advisory_xact_lock(hashtext('booking:' || _b.seller_id::text));
  if action = 'conferma' and _seller and _b.status = 'in_attesa' then
    if new_starts_at is not null and new_starts_at = _b.alt_starts_at then
      _b.starts_at := _b.alt_starts_at;
    end if;
    if not private.slot_is_free(_b.seller_id, _b.starts_at, _b.starts_at + _len, _b.id) then
      raise exception 'L''orario non è più libero: proponi un altro orario' using errcode = '23P01';
    end if;
    update public.vehicle_bookings set status = 'confermato', starts_at = _b.starts_at, ends_at = _b.starts_at + _len, decision_note = note where id = _b.id;
    _new := 'confermato'; _title := 'Appuntamento confermato';
  elsif action = 'rifiuta' and _seller and _b.status in ('in_attesa', 'modifica_proposta') then
    update public.vehicle_bookings set status = 'rifiutato', decision_note = note where id = _b.id; _new := 'rifiutato'; _title := 'Appuntamento non confermato';
  elsif action = 'proponi' and _seller and _b.status in ('in_attesa', 'confermato') then
    if new_starts_at is null or new_starts_at < now() then raise exception 'Indica un nuovo orario futuro' using errcode = '22023'; end if;
    if not private.slot_is_free(_b.seller_id, new_starts_at, new_starts_at + _len, _b.id) then raise exception 'Hai già un impegno in quell''orario' using errcode = '23P01'; end if;
    update public.vehicle_bookings set status = 'modifica_proposta', proposed_starts_at = new_starts_at, decision_note = note where id = _b.id;
    _new := 'modifica_proposta'; _title := 'Il venditore propone un altro orario';
  elsif action = 'accetta_modifica' and not _seller and _b.status = 'modifica_proposta' then
    if not private.slot_is_free(_b.seller_id, _b.proposed_starts_at, _b.proposed_starts_at + _len, _b.id) then raise exception 'L''orario proposto non è più libero' using errcode = '23P01'; end if;
    update public.vehicle_bookings set status = 'confermato', starts_at = _b.proposed_starts_at, ends_at = _b.proposed_starts_at + _len, proposed_starts_at = null,
           reminded_24h = false, reminded_2h = false where id = _b.id;
    _new := 'confermato'; _title := 'Nuovo orario accettato';
  elsif action = 'rifiuta_modifica' and not _seller and _b.status = 'modifica_proposta' then
    update public.vehicle_bookings set status = 'annullato', decision_note = coalesce(note, 'Orario alternativo non accettato') where id = _b.id;
    _new := 'annullato'; _title := 'Orario alternativo rifiutato';
  elsif action = 'annulla' and _b.status in ('in_attesa', 'confermato', 'modifica_proposta') then
    if _b.status = 'confermato' and coalesce(trim(note), '') = '' then raise exception 'Indica il motivo dell''annullamento' using errcode = '22023'; end if;
    update public.vehicle_bookings set status = 'annullato', decision_note = note where id = _b.id; _new := 'annullato'; _title := 'Appuntamento annullato';
  elsif action in ('completa', 'mancata_presentazione') and _seller and _b.status = 'confermato' then
    if _b.starts_at > now() then raise exception 'L''appuntamento non è ancora avvenuto' using errcode = '22023'; end if;
    _new := case when action = 'completa' then 'completato' else 'mancata_presentazione' end;
    update public.vehicle_bookings set status = _new, decision_note = note where id = _b.id; _title := 'Appuntamento aggiornato';
  else
    raise exception 'Operazione non consentita in questo stato' using errcode = '42501';
  end if;
  select * into _b from public.vehicle_bookings where id = booking_id;
  insert into public.vehicle_booking_events (booking_id, actor_id, event, data)
  values (_b.id, _uid, action, jsonb_build_object('status', _new, 'starts_at', _b.starts_at, 'proposed', _b.proposed_starts_at, 'note', note));
  perform private.booking_message(_b, _title || ': ' || to_char(coalesce(_b.proposed_starts_at, _b.starts_at) at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI') || coalesce(' — ' || note, ''));
  perform private.notify(_other, 'appuntamenti', _title, to_char(coalesce(_b.proposed_starts_at, _b.starts_at) at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI'),
    '/dashboard/prenotazioni' || case when _other = _b.seller_id then '?vista=venditore' else '' end, 'booking:' || _b.id || ':' || action || ':' || coalesce(_b.proposed_starts_at, _b.starts_at));
end;
$$;
revoke all on function public.respond_booking(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.respond_booking(uuid, text, timestamptz, text) to authenticated;

-- Indirizzo dell'incontro: visibile all'acquirente solo dopo la conferma.
create or replace function public.booking_meeting_info(booking_id uuid)
returns table (address text, test_drive_conditions text)
language sql stable security definer set search_path = ''
as $$
  select s.meeting_address, s.test_drive_conditions from public.vehicle_bookings b join public.booking_settings s on s.owner_id = b.seller_id
   where b.id = booking_id and (b.seller_id = auth.uid() or (b.buyer_id = auth.uid() and b.status in ('confermato', 'completato')))
$$;
revoke all on function public.booking_meeting_info(uuid) from public, anon;
grant execute on function public.booking_meeting_info(uuid) to authenticated;

-- Condizioni del test drive (pubbliche, per informare prima della richiesta).
create or replace function public.booking_public_settings(listing_id uuid)
returns table (enabled boolean, test_drive_enabled boolean, test_drive_min_years integer, test_drive_conditions text, slot_minutes integer)
language sql stable security definer set search_path = ''
as $$
  select true, s.test_drive_enabled, s.test_drive_min_years, s.test_drive_conditions, s.slot_minutes
    from public.vehicle_listings l join public.booking_settings s on s.owner_id = l.owner_id
   where l.id = booking_public_settings.listing_id and l.status = 'pubblicato'
$$;
grant execute on function public.booking_public_settings(uuid) to anon, authenticated;

-- Promemoria automatici 24 h e 2 h prima (job lato server, senza duplicati).
create or replace function private.process_booking_reminders()
returns void language plpgsql security definer set search_path = ''
as $$
declare _b record;
begin
  for _b in select vb.*, l.title from public.vehicle_bookings vb join public.vehicle_listings l on l.id = vb.listing_id
             where vb.status = 'confermato' and vb.starts_at > now() and vb.starts_at <= now() + interval '24 hours' loop
    if not _b.reminded_24h and _b.starts_at > now() + interval '2 hours' then
      perform private.notify(_b.buyer_id, 'appuntamenti', 'Promemoria: appuntamento domani', _b.title || ' — ' || to_char(_b.starts_at at time zone 'Europe/Rome', 'DD/MM HH24:MI'), '/dashboard/prenotazioni', 'bk24:' || _b.id || ':' || _b.starts_at, 'promemoria_appuntamento');
      perform private.notify(_b.seller_id, 'appuntamenti', 'Promemoria: appuntamento domani', _b.title || ' — ' || to_char(_b.starts_at at time zone 'Europe/Rome', 'DD/MM HH24:MI'), '/dashboard/prenotazioni?vista=venditore', 'bk24:' || _b.id || ':' || _b.starts_at);
      update public.vehicle_bookings set reminded_24h = true where id = _b.id;
    elsif not _b.reminded_2h and _b.starts_at <= now() + interval '2 hours' then
      perform private.notify(_b.buyer_id, 'appuntamenti', 'Promemoria: appuntamento tra meno di 2 ore', _b.title, '/dashboard/prenotazioni', 'bk2:' || _b.id || ':' || _b.starts_at);
      perform private.notify(_b.seller_id, 'appuntamenti', 'Promemoria: appuntamento tra meno di 2 ore', _b.title, '/dashboard/prenotazioni?vista=venditore', 'bk2:' || _b.id || ':' || _b.starts_at);
      update public.vehicle_bookings set reminded_2h = true, reminded_24h = true where id = _b.id;
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-promemoria-prenotazioni', '*/15 * * * *', 'select private.process_booking_reminders()');
    perform cron.schedule('ag24-offerte-scadute', '7 1 * * *', 'select private.expire_offers()');
  end if;
end;
$$;

create or replace function public.seller_listing_stats()
returns table (listing_id uuid, title text, slug text, status public.listing_status, views integer, favorites bigint, requests bigint, bookings bigint, price_changes bigint)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.title, l.slug, l.status, l.view_count,
         (select count(*) from public.favorites f where f.listing_id = l.id),
         (select count(*) from public.requests r where r.listing_id = l.id),
         (select count(*) from public.vehicle_bookings b where b.listing_id = l.id),
         (select count(*) from public.vehicle_price_history h where h.listing_id = l.id)
    from public.vehicle_listings l where l.owner_id = auth.uid() order by l.created_at desc
$$;

alter table public.booking_settings enable row level security;
alter table public.booking_availability enable row level security;
alter table public.booking_blocks enable row level security;
alter table public.vehicle_bookings enable row level security;
alter table public.vehicle_booking_events enable row level security;
alter table public.calendar_connections enable row level security;
revoke all on table public.booking_settings, public.booking_availability, public.booking_blocks, public.vehicle_bookings, public.vehicle_booking_events, public.calendar_connections from anon, authenticated;
grant all on table public.booking_settings, public.booking_availability, public.booking_blocks, public.vehicle_bookings, public.vehicle_booking_events, public.calendar_connections to service_role;
grant select, insert, update, delete on table public.booking_settings, public.booking_availability, public.booking_blocks to authenticated;
grant select on table public.vehicle_bookings, public.vehicle_booking_events, public.calendar_connections to authenticated;
create policy "booking_settings: proprie" on public.booking_settings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "booking_availability: proprie" on public.booking_availability for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "booking_blocks: propri" on public.booking_blocks for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "vehicle_bookings: parti" on public.vehicle_bookings for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy "vehicle_bookings: staff" on public.vehicle_bookings for select to authenticated using ((select private.has_permission('bookings.manage')));
create policy "vehicle_booking_events: parti e staff" on public.vehicle_booking_events for select to authenticated
  using (exists (select 1 from public.vehicle_bookings b where b.id = booking_id and (b.buyer_id = (select auth.uid()) or b.seller_id = (select auth.uid())))
         or (select private.has_permission('bookings.manage')));
create policy "calendar_connections: proprie" on public.calendar_connections for select to authenticated using (owner_id = (select auth.uid()));

-- Intervento dello staff su una prenotazione (es. abuso), con motivazione nel registro.
create or replace function public.admin_cancel_booking(booking_id uuid, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _b public.vehicle_bookings%rowtype;
begin
  if not private.has_permission('bookings.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if coalesce(char_length(trim(reason)), 0) < 10 then raise exception 'Motivazione di almeno 10 caratteri' using errcode = '22023'; end if;
  update public.vehicle_bookings set status = 'annullato', decision_note = 'Annullato dallo staff: ' || reason where id = booking_id and status in ('in_attesa', 'confermato', 'modifica_proposta')
  returning * into _b;
  if not found then raise exception 'Prenotazione non trovata o già chiusa' using errcode = 'P0002'; end if;
  insert into public.vehicle_booking_events (booking_id, actor_id, event, data) values (booking_id, auth.uid(), 'annullata_staff', jsonb_build_object('reason', reason));
  perform private.notify(_b.buyer_id, 'appuntamenti', 'Appuntamento annullato dallo staff', reason, '/dashboard/prenotazioni', 'bk-staff:' || booking_id);
  perform private.notify(_b.seller_id, 'appuntamenti', 'Appuntamento annullato dallo staff', reason, '/dashboard/prenotazioni?vista=venditore', 'bk-staff:' || booking_id);
  perform private.log_admin_action('booking.cancelled', 'vehicle_bookings', booking_id::text, jsonb_build_object('reason', reason));
end;
$$;
revoke all on function public.admin_cancel_booking(uuid, text) from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;

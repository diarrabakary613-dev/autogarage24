-- =====================================================================
-- Migrazione 0026 — Fase 32: Growth Engine
-- Estende il Centro marketing (Fase 12) senza duplicarlo:
--  * attribuzione della registrazione (UTM, landing, invito) per utente;
--  * campagne: destinatari (utenti/partner), codice promo, nuovi pubblici;
--  * landing page configurabili senza codice, con variante A/B;
--  * email promozionali solo con consenso: registro consensi, disiscrizione con token,
--    segmenti, approvazione del fondatore, registro invii, limite di frequenza;
--  * automazioni con condizioni predefinite, limiti e interruttore (spente di default).
-- Nessun invio parte senza un provider email configurato (coda email_outbox).
-- =====================================================================

insert into public.role_permissions (role, permission)
select r::public.app_role, 'growth.manage' from unnest(array['admin', 'super_admin']) r on conflict do nothing;

insert into public.platform_settings (key, value, description) values
  ('marketing_email_min_days', '7', 'Giorni minimi tra due email promozionali alla stessa persona.'),
  ('marketing_workflows_enabled', 'false', 'Interruttore generale delle automazioni di marketing.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Attribuzione della registrazione
-- ---------------------------------------------------------------------
create table public.user_acquisition (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  requested_role text check (char_length(requested_role) <= 30),
  landing        text check (landing ~ '^/[a-z0-9/_-]{0,199}$'),
  utm_source     text check (utm_source ~ '^[a-z0-9_.-]{1,80}$'),
  utm_medium     text check (utm_medium ~ '^[a-z0-9_.-]{1,80}$'),
  utm_campaign   text check (utm_campaign ~ '^[a-z0-9_.-]{1,80}$'),
  utm_content    text check (utm_content ~ '^[a-z0-9_.-]{1,80}$'),
  referral_code  text check (referral_code ~ '^[A-Z0-9]{6,12}$'),
  created_at     timestamptz not null default now()
);
create index user_acquisition_time_idx on public.user_acquisition (created_at desc);
create index user_acquisition_campaign_idx on public.user_acquisition (utm_campaign) where utm_campaign is not null;

create or replace function private.capture_acquisition()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        _c text := '^[a-z0-9_.-]{1,80}$';
begin
  if not exists (select 1 from public.profiles where id = new.id) then return null; end if;
  insert into public.user_acquisition (user_id, requested_role, landing, utm_source, utm_medium, utm_campaign, utm_content, referral_code)
  values (new.id, left(coalesce(_m ->> 'requested_role', 'cliente'), 30),
          case when (_m ->> 'landing') ~ '^/[a-z0-9/_-]{0,199}$' then _m ->> 'landing' end,
          case when (_m ->> 'utm_source') ~ _c then _m ->> 'utm_source' end,
          case when (_m ->> 'utm_medium') ~ _c then _m ->> 'utm_medium' end,
          case when (_m ->> 'utm_campaign') ~ _c then _m ->> 'utm_campaign' end,
          case when (_m ->> 'utm_content') ~ _c then _m ->> 'utm_content' end,
          case when upper(_m ->> 'referral_code') ~ '^[A-Z0-9]{6,12}$' then upper(_m ->> 'referral_code') end)
  on conflict (user_id) do nothing;
  return null;
end;
$$;
create trigger on_auth_user_created_acquisition after insert on auth.users for each row execute function private.capture_acquisition();

-- ---------------------------------------------------------------------
-- Campagne (estensione)
-- ---------------------------------------------------------------------
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_audience_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_audience_check check (audience in (
  'neopatentati', 'acquirenti', 'proprietari', 'officine', 'meccanici', 'concessionari', 'ricambi', 'generale', 'inattivi', 'professionisti'));
alter table public.marketing_campaigns
  add column target text not null default 'utenti' check (target in ('utenti', 'partner')),
  add column promo_code text check (promo_code ~ '^[A-Z0-9-]{4,30}$');

-- ---------------------------------------------------------------------
-- Landing page configurabili (/lp/[slug])
-- ---------------------------------------------------------------------
create table public.landing_pages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  title          text not null check (char_length(title) between 5 and 70),
  meta_description text check (char_length(meta_description) <= 160),
  audience       text not null default 'generale' check (audience in ('neopatentati', 'acquirenti', 'proprietari', 'officine', 'meccanici', 'concessionari', 'ricambi', 'generale', 'inattivi', 'professionisti')),
  headline       text not null check (char_length(headline) between 5 and 120),
  subheadline    text check (char_length(subheadline) <= 300),
  body           text check (char_length(body) <= 4000),
  bullets        text[] not null default '{}' check (cardinality(bullets) <= 8),
  cta_label      text not null check (char_length(cta_label) between 2 and 40),
  cta_path       text not null check (cta_path ~ '^/[a-z0-9/_?=&-]{0,199}$'),
  section        text not null default 'nessuna' check (section in ('nessuna', 'auto_neopatentati', 'auto_usate', 'officine', 'offerte')),
  variant_b_headline  text check (char_length(variant_b_headline) between 5 and 120),
  variant_b_cta_label text check (char_length(variant_b_cta_label) between 2 and 40),
  experiment_active boolean not null default false,
  campaign_id    uuid references public.marketing_campaigns (id) on delete set null,
  indexable      boolean not null default false,
  status         text not null default 'bozza' check (status in ('bozza', 'pubblicata', 'archiviata')),
  published_at   timestamptz,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (not experiment_active or variant_b_headline is not null or variant_b_cta_label is not null),
  check (cta_path !~ '^//')
);
create trigger landing_pages_updated before update on public.landing_pages for each row execute function private.set_updated_at();

create or replace function private.landing_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'pubblicata' and (tg_op = 'INSERT' or old.status <> 'pubblicata') then new.published_at := now(); end if;
  if tg_op = 'UPDATE' then new.created_by := old.created_by; end if;
  return new;
end;
$$;
create trigger landing_pages_before_write before insert or update on public.landing_pages for each row execute function private.landing_before_write();

-- Eventi di misurazione: si aggiungono vista e clic delle landing (con variante), stesso controllo di prima.
create or replace function public.track_event(
  p_event text, p_path text, p_landing text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null, p_referrer_host text default null,
  p_device text default null, p_is_entry boolean default false, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_event not in ('page_view', 'cta_click', 'ricerca_auto', 'apertura_scheda_auto', 'ricerca_officine',
                     'ricerca_ricambi', 'apertura_profilo', 'calcolo_neopatentati', 'mappa_ricerca', 'lp_view', 'lp_cta') then
    return;
  end if;
  if p_path is null or p_path !~ '^/[A-Za-z0-9/_.-]{0,199}$' then return; end if;
  if p_event in ('lp_view', 'lp_cta') and not (coalesce(p_meta ->> 'variant', '') in ('a', 'b') and coalesce(p_meta ->> 'lp', '') ~ '^[a-z0-9-]{3,60}$') then return; end if;
  if (select count(*) from public.analytics_events where occurred_at > now() - interval '1 minute') > 3000 then return; end if;
  insert into public.analytics_events (event, path, landing, utm_source, utm_medium, utm_campaign, utm_content,
                                       referrer_host, device, is_entry, meta)
  values (p_event, p_path,
          case when p_landing ~ '^/[A-Za-z0-9/_.-]{0,199}$' then p_landing end,
          left(lower(regexp_replace(p_utm_source, '[^a-zA-Z0-9_.-]', '', 'g')), 80),
          left(lower(regexp_replace(p_utm_medium, '[^a-zA-Z0-9_.-]', '', 'g')), 80),
          left(lower(regexp_replace(p_utm_campaign, '[^a-zA-Z0-9_.-]', '', 'g')), 80),
          left(lower(regexp_replace(p_utm_content, '[^a-zA-Z0-9_.-]', '', 'g')), 80),
          case when p_referrer_host ~ '^[a-z0-9.-]{3,120}$' then p_referrer_host end,
          case when p_device in ('mobile', 'tablet', 'desktop') then p_device end,
          coalesce(p_is_entry, false),
          case when jsonb_typeof(p_meta) = 'object' and pg_column_size(p_meta) <= 600 then p_meta else '{}'::jsonb end);
end;
$$;

create or replace function public.admin_landing_results(p_slug text, days integer default 90)
returns table (variant text, views bigint, cta_clicks bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('growth.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return query
  select v.v, count(*) filter (where e.event = 'lp_view'), count(*) filter (where e.event = 'lp_cta')
  from (values ('a'), ('b')) v(v)
  left join public.analytics_events e on e.meta ->> 'lp' = p_slug and e.meta ->> 'variant' = v.v and e.event in ('lp_view', 'lp_cta')
       and e.occurred_at > now() - make_interval(days => least(greatest(days, 1), 730))
  group by v.v order by v.v;
end;
$$;

-- ---------------------------------------------------------------------
-- Consensi e disiscrizione
-- ---------------------------------------------------------------------
create table public.marketing_consent_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  consent     boolean not null,
  source      text not null check (source in ('registrazione', 'impostazioni', 'disiscrizione', 'staff', 'cancellazione')),
  created_at  timestamptz not null default now()
);
create index marketing_consent_log_user_idx on public.marketing_consent_log (user_id, created_at desc);
create trigger marketing_consent_log_immutable before update or delete on public.marketing_consent_log for each row execute function private.history_immutable();

create or replace function private.log_marketing_consent()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.marketing_consent_log (user_id, consent, source) values (new.id, new.marketing_consent, 'registrazione');
  elsif new.marketing_consent is distinct from old.marketing_consent then
    insert into public.marketing_consent_log (user_id, consent, source)
    values (new.id, new.marketing_consent, coalesce(nullif(current_setting('ag24.consent_source', true), ''), 'impostazioni'));
  end if;
  return null;
end;
$$;
create trigger profiles_marketing_consent_log after insert or update of marketing_consent on public.profiles for each row execute function private.log_marketing_consent();

create table public.email_unsubscribe_tokens (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  token       text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  created_at  timestamptz not null default now()
);

create or replace function private.unsubscribe_token(_user uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare _t text;
begin
  select token into _t from public.email_unsubscribe_tokens where user_id = _user;
  if _t is not null then return _t; end if;
  _t := translate(encode(decode(md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text), 'hex'), 'base64'), '+/=', '-_');
  insert into public.email_unsubscribe_tokens (user_id, token) values (_user, _t) on conflict (user_id) do nothing;
  return (select token from public.email_unsubscribe_tokens where user_id = _user);
end;
$$;

-- Disiscrizione senza accesso (link nelle email). Il token non rivela dati.
create or replace function public.marketing_unsubscribe(p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare _u uuid;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then return false; end if;
  select user_id into _u from public.email_unsubscribe_tokens where token = p_token;
  if _u is null then return false; end if;
  perform set_config('ag24.consent_source', 'disiscrizione', true);
  update public.profiles set marketing_consent = false where id = _u and marketing_consent;
  update public.notification_preferences set email = coalesce(email, '{}'::jsonb) || '{"promozioni": false}'::jsonb where user_id = _u;
  update public.email_outbox set status = 'annullata' where user_id = _u and template = 'marketing' and status = 'in_coda';
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Email promozionali
-- ---------------------------------------------------------------------
create table public.marketing_messages (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.marketing_campaigns (id) on delete set null,
  subject       text not null check (char_length(subject) between 5 and 120),
  body          text not null check (char_length(body) between 20 and 4000),
  cta_label     text check (char_length(cta_label) between 2 and 40),
  cta_path      text check (cta_path ~ '^/[a-z0-9/_?=&-]{0,199}$' and cta_path !~ '^//'),
  channels      text[] not null default '{email}' check (cardinality(channels) > 0 and channels <@ array['email', 'in_app']),
  segment       jsonb not null default '{}'::jsonb check (jsonb_typeof(segment) = 'object' and pg_column_size(segment) <= 1000),
  status        text not null default 'bozza' check (status in ('bozza', 'da_approvare', 'approvato', 'inviato', 'annullato')),
  approved_by   uuid references public.profiles (id) on delete set null,
  approved_at   timestamptz,
  sent_at       timestamptz,
  recipients    integer,
  excluded      integer,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger marketing_messages_updated before update on public.marketing_messages for each row execute function private.set_updated_at();

create or replace function private.marketing_messages_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status in ('inviato', 'annullato') then raise exception 'Messaggio già concluso: non modificabile' using errcode = '42501'; end if;
    new.created_by := old.created_by; new.approved_by := old.approved_by; new.approved_at := old.approved_at;
    new.sent_at := old.sent_at; new.recipients := old.recipients; new.excluded := old.excluded;
    -- Ogni modifica dopo l'approvazione richiede una nuova approvazione.
    if old.status = 'approvato' and (new.subject, new.body, new.cta_label, new.cta_path, new.segment, new.channels) is distinct from (old.subject, old.body, old.cta_label, old.cta_path, old.segment, old.channels) then
      new.status := 'da_approvare'; new.approved_by := null; new.approved_at := null;
    end if;
  else
    new.approved_by := null; new.approved_at := null; new.sent_at := null; new.recipients := null; new.excluded := null;
  end if;
  if new.status not in ('bozza', 'da_approvare', 'annullato') and (tg_op = 'INSERT' or new.status <> old.status) then
    raise exception 'Approvazione e invio passano dalle funzioni dedicate' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger marketing_messages_guard before insert or update on public.marketing_messages for each row execute function private.marketing_messages_guard();

create table public.marketing_sends (
  id          bigint generated always as identity primary key,
  message_id  uuid references public.marketing_messages (id) on delete cascade,
  workflow_key text,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  channel     text not null check (channel in ('email', 'in_app')),
  status      text not null check (status in ('in_coda', 'consegnato', 'escluso')),
  reason      text check (reason in ('nessun_consenso', 'preferenza_disattivata', 'limite_frequenza', 'account_non_attivo')),
  outbox_id   uuid references public.email_outbox (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((message_id is null) <> (workflow_key is null))
);
create unique index marketing_sends_once on public.marketing_sends (message_id, user_id, channel) where message_id is not null;
create index marketing_sends_user_idx on public.marketing_sends (user_id, channel, created_at desc);

-- Email promozionale ammessa: consenso esplicito; la preferenza «Promozioni» funziona come ulteriore rinuncia.
create or replace function private.promo_email_allowed(_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.marketing_consent and p.account_status = 'attivo' from public.profiles p where p.id = _user), false)
     and coalesce((select (np.email ->> 'promozioni')::boolean from public.notification_preferences np where np.user_id = _user), true);
$$;

-- Pubblico di un segmento (filtri fissi, nessuna query libera).
create or replace function private.marketing_audience(_segment jsonb)
returns table (user_id uuid)
language sql stable security definer set search_path = ''
as $$
  select p.id from public.profiles p
  where p.account_status = 'attivo' and p.deleted_at is null
    and (_segment ->> 'citta' is null or lower(p.city) = lower(_segment ->> 'citta'))
    and (_segment ->> 'ruolo' is null
         or (_segment ->> 'ruolo' = 'professionisti' and exists (select 1 from public.professional_profiles pp where pp.user_id = p.id and pp.deleted_at is null))
         or (_segment ->> 'ruolo' = 'neopatentati' and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text = 'neopatentato'))
         or (_segment ->> 'ruolo' = 'clienti' and not exists (select 1 from public.professional_profiles pp where pp.user_id = p.id and pp.deleted_at is null)))
    and (_segment ->> 'inattivi_giorni' is null or (
         p.created_at < now() - make_interval(days => (_segment ->> 'inattivi_giorni')::integer)
         and not exists (select 1 from public.requests r where r.requester_id = p.id and r.created_at > now() - make_interval(days => (_segment ->> 'inattivi_giorni')::integer))
         and not exists (select 1 from public.vehicle_bookings b where b.buyer_id = p.id and b.created_at > now() - make_interval(days => (_segment ->> 'inattivi_giorni')::integer))))
    and (_segment ->> 'registrati_da_giorni' is null or p.created_at > now() - make_interval(days => (_segment ->> 'registrati_da_giorni')::integer))
    and (_segment ->> 'campagna' is null or exists (select 1 from public.user_acquisition a where a.user_id = p.id and a.utm_campaign = _segment ->> 'campagna'));
$$;

create or replace function private.valid_segment(_s jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select jsonb_typeof(_s) = 'object'
     and not exists (select 1 from jsonb_object_keys(_s) k where k not in ('citta', 'ruolo', 'inattivi_giorni', 'registrati_da_giorni', 'campagna'))
     and (_s ->> 'ruolo' is null or _s ->> 'ruolo' in ('clienti', 'neopatentati', 'professionisti'))
     and (_s ->> 'inattivi_giorni' is null or (_s ->> 'inattivi_giorni') ~ '^[0-9]{1,3}$')
     and (_s ->> 'registrati_da_giorni' is null or (_s ->> 'registrati_da_giorni') ~ '^[0-9]{1,3}$')
     and (_s ->> 'citta' is null or char_length(_s ->> 'citta') <= 80)
     and (_s ->> 'campagna' is null or (_s ->> 'campagna') ~ '^[a-z0-9_.-]{1,80}$');
$$;
alter table public.marketing_messages add constraint marketing_messages_segment_valid check (private.valid_segment(segment));

-- Anteprima: quante persone riceverebbero, e quante sarebbero escluse (solo conteggi).
create or replace function public.admin_marketing_audience(p_segment jsonb)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _min integer := coalesce((private.setting('marketing_email_min_days'))::text::integer, 7);
begin
  if not private.has_permission('growth.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if not private.valid_segment(p_segment) then raise exception 'Segmento non valido' using errcode = '22023'; end if;
  return (select jsonb_build_object(
    'totale', count(*),
    'email_con_consenso', count(*) filter (where private.promo_email_allowed(p.id)),
    'limite_frequenza', count(*) filter (where exists (select 1 from public.marketing_sends s where s.user_id = p.id and s.channel = 'email' and s.status = 'in_coda' and s.created_at > now() - make_interval(days => _min))),
    'in_app', count(*) filter (where private.pref_enabled(p.id, 'in_app', 'promozioni')))
    from private.marketing_audience(p_segment) a join public.profiles p on p.id = a.user_id);
end;
$$;

-- Approvazione: solo il fondatore (super_admin).
create or replace function public.admin_approve_marketing_message(message_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role('super_admin') then raise exception 'Solo il fondatore può approvare le comunicazioni promozionali' using errcode = '42501'; end if;
  perform set_config('ag24.trusted', 'on', true);
  update public.marketing_messages set status = 'approvato', approved_by = auth.uid(), approved_at = now() where id = message_id and status = 'da_approvare';
  if not found then raise exception 'Il messaggio deve essere in attesa di approvazione' using errcode = '22023'; end if;
  perform set_config('ag24.trusted', 'off', true);
  perform private.log_admin_action('marketing.approve_message', 'marketing_messages', message_id::text, '{}'::jsonb);
end;
$$;

-- Invio: crea la coda email (solo consenso valido) e le notifiche in app; registra ogni esclusione.
create or replace function public.admin_send_marketing_message(message_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare _m public.marketing_messages%rowtype; _p record; _min integer := coalesce((private.setting('marketing_email_min_days'))::text::integer, 7);
        _sent integer := 0; _excl integer := 0; _out uuid; _reason text; _tok text;
begin
  if not private.has_permission('growth.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  select * into _m from public.marketing_messages where id = message_id for update;
  if not found or _m.status <> 'approvato' then raise exception 'Si possono inviare solo messaggi approvati dal fondatore' using errcode = '22023'; end if;
  perform set_config('ag24.trusted', 'on', true);
  for _p in select p.id, p.email, p.marketing_consent from private.marketing_audience(_m.segment) a join public.profiles p on p.id = a.user_id loop
    if 'email' = any(_m.channels) then
      _reason := case when not _p.marketing_consent then 'nessun_consenso'
                      when not private.promo_email_allowed(_p.id) then 'preferenza_disattivata'
                      when exists (select 1 from public.marketing_sends s where s.user_id = _p.id and s.channel = 'email' and s.status = 'in_coda' and s.created_at > now() - make_interval(days => _min)) then 'limite_frequenza'
                      when coalesce(_p.email, '') = '' then 'account_non_attivo' end;
      if _reason is null then
        _tok := private.unsubscribe_token(_p.id);
        insert into public.email_outbox (user_id, to_email, template, subject, payload, dedupe_key)
        values (_p.id, _p.email, 'marketing', _m.subject,
                jsonb_build_object('title', _m.subject, 'body', _m.body, 'cta_label', _m.cta_label, 'link', _m.cta_path, 'unsubscribe_path', '/disiscriviti/' || _tok),
                _p.id::text || ':mkt:' || _m.id)
        on conflict (dedupe_key) do nothing returning id into _out;
        insert into public.marketing_sends (message_id, user_id, channel, status, outbox_id) values (_m.id, _p.id, 'email', 'in_coda', _out) on conflict do nothing;
        _sent := _sent + 1;
      else
        insert into public.marketing_sends (message_id, user_id, channel, status, reason) values (_m.id, _p.id, 'email', 'escluso', _reason) on conflict do nothing;
        _excl := _excl + 1;
      end if;
    end if;
    if 'in_app' = any(_m.channels) then
      if private.pref_enabled(_p.id, 'in_app', 'promozioni') then
        perform private.notify(_p.id, 'promozioni', _m.subject, left(_m.body, 600), coalesce(_m.cta_path, '/'), 'mkt:' || _m.id);
        insert into public.marketing_sends (message_id, user_id, channel, status) values (_m.id, _p.id, 'in_app', 'consegnato') on conflict do nothing;
      else
        insert into public.marketing_sends (message_id, user_id, channel, status, reason) values (_m.id, _p.id, 'in_app', 'escluso', 'preferenza_disattivata') on conflict do nothing;
      end if;
    end if;
  end loop;
  update public.marketing_messages set status = 'inviato', sent_at = now(), recipients = _sent, excluded = _excl where id = _m.id;
  perform set_config('ag24.trusted', 'off', true);
  perform private.log_admin_action('marketing.send_message', 'marketing_messages', _m.id::text, jsonb_build_object('email_in_coda', _sent, 'esclusi', _excl));
  return jsonb_build_object('email_in_coda', _sent, 'esclusi', _excl);
end;
$$;

-- ---------------------------------------------------------------------
-- Automazioni (condizioni predefinite, spente finché il fondatore non le attiva)
-- ---------------------------------------------------------------------
create table public.marketing_workflows (
  key           text primary key check (key in ('benvenuto_senza_attivita', 'garage_vuoto', 'partner_profilo_non_pubblicato', 'utente_inattivo')),
  name          text not null,
  condition_description text not null,
  delay_days    integer not null check (delay_days between 1 and 365),
  title         text not null check (char_length(title) between 5 and 120),
  body          text not null check (char_length(body) between 10 and 600),
  link          text not null check (link ~ '^/[a-z0-9/_?=&-]{0,199}$' and link !~ '^//'),
  send_email    boolean not null default false,
  max_per_user  integer not null default 1 check (max_per_user between 1 and 5),
  cooldown_days integer not null default 30 check (cooldown_days between 1 and 365),
  active        boolean not null default false,
  activated_by  uuid references public.profiles (id) on delete set null,
  activated_at  timestamptz,
  updated_at    timestamptz not null default now()
);
insert into public.marketing_workflows (key, name, condition_description, delay_days, title, body, link) values
  ('benvenuto_senza_attivita', 'Primi passi', 'Registrato da N giorni, nessuna richiesta, nessuna visita prenotata e nessuna auto nel garage.', 3,
   'Da dove iniziare su AutoGarage24', 'Aggiungi la tua auto nel garage per ricevere le scadenze, oppure cerca un''officina verificata vicino a te.', '/dashboard/garage-auto'),
  ('garage_vuoto', 'Garage vuoto', 'Utente registrato da N giorni senza alcuna automobile in Il mio Garage.', 7,
   'Aggiungi la tua auto al garage', 'Con l''auto nel garage ricevi i promemoria di revisione, tagliando e assicurazione.', '/dashboard/garage-auto'),
  ('partner_profilo_non_pubblicato', 'Profilo partner da completare', 'Profilo professionale creato da N giorni e non ancora pubblicato.', 5,
   'Completa il profilo della tua attività', 'Un profilo completo con orari, servizi e foto viene verificato e pubblicato più rapidamente.', '/dashboard/profilo-professionale'),
  ('utente_inattivo', 'Utente inattivo', 'Ha usato la piattaforma in passato ma nessuna richiesta o visita negli ultimi N giorni.', 90,
   'Novità su AutoGarage24', 'Scopri le officine e le offerte dei partner nella tua zona.', '/offerte')
on conflict (key) do nothing;

create or replace function private.workflows_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.active and not old.active then
    if not private.has_role('super_admin') then raise exception 'Solo il fondatore può attivare un''automazione' using errcode = '42501'; end if;
    new.activated_by := auth.uid(); new.activated_at := now();
  elsif not new.active then new.activated_by := old.activated_by; new.activated_at := old.activated_at;
  else
    new.activated_by := old.activated_by; new.activated_at := old.activated_at;
    -- Testo o condizioni cambiati con l'automazione attiva: torna spenta, serve una nuova attivazione.
    if (new.title, new.body, new.link, new.delay_days, new.send_email) is distinct from (old.title, old.body, old.link, old.delay_days, old.send_email) then new.active := false; end if;
  end if;
  new.key := old.key; new.condition_description := old.condition_description;
  return new;
end;
$$;
create trigger marketing_workflows_guard before update on public.marketing_workflows for each row execute function private.workflows_guard();
create trigger marketing_workflows_updated before update on public.marketing_workflows for each row execute function private.set_updated_at();

create or replace function private.run_marketing_workflows()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _w public.marketing_workflows%rowtype; _u uuid; _n integer := 0; _email text; _min integer := coalesce((private.setting('marketing_email_min_days'))::text::integer, 7);
begin
  if coalesce((private.setting('marketing_workflows_enabled'))::text, 'false') <> 'true' then return 0; end if;
  for _w in select * from public.marketing_workflows where active loop
    for _u in
      select p.id from public.profiles p
      where p.account_status = 'attivo' and p.deleted_at is null
        and (select count(*) from public.marketing_sends s where s.user_id = p.id and s.workflow_key = _w.key) < _w.max_per_user
        and not exists (select 1 from public.marketing_sends s where s.user_id = p.id and s.workflow_key = _w.key and s.created_at > now() - make_interval(days => _w.cooldown_days))
        and case _w.key
          when 'benvenuto_senza_attivita' then p.created_at < now() - make_interval(days => _w.delay_days) and p.created_at > now() - make_interval(days => _w.delay_days + 14)
               and not exists (select 1 from public.requests r where r.requester_id = p.id)
               and not exists (select 1 from public.vehicle_bookings b where b.buyer_id = p.id)
               and not exists (select 1 from public.user_vehicles v where v.owner_id = p.id)
               and not exists (select 1 from public.professional_profiles pp where pp.user_id = p.id)
          when 'garage_vuoto' then p.created_at < now() - make_interval(days => _w.delay_days)
               and not exists (select 1 from public.user_vehicles v where v.owner_id = p.id)
               and not exists (select 1 from public.professional_profiles pp where pp.user_id = p.id)
          when 'partner_profilo_non_pubblicato' then exists (select 1 from public.professional_profiles pp where pp.user_id = p.id and pp.deleted_at is null and not pp.is_published
               and pp.created_at < now() - make_interval(days => _w.delay_days))
          when 'utente_inattivo' then exists (select 1 from public.requests r where r.requester_id = p.id)
               and not exists (select 1 from public.requests r where r.requester_id = p.id and r.created_at > now() - make_interval(days => _w.delay_days))
               and not exists (select 1 from public.vehicle_bookings b where b.buyer_id = p.id and b.created_at > now() - make_interval(days => _w.delay_days))
          else false end
      limit 500
    loop
      if private.pref_enabled(_u, 'in_app', 'promozioni') then
        perform private.notify(_u, 'promozioni', _w.title, _w.body, _w.link, 'wf:' || _w.key || ':' || to_char(now(), 'YYYYMMDD'));
        insert into public.marketing_sends (workflow_key, user_id, channel, status) values (_w.key, _u, 'in_app', 'consegnato');
      else
        insert into public.marketing_sends (workflow_key, user_id, channel, status, reason) values (_w.key, _u, 'in_app', 'escluso', 'preferenza_disattivata');
      end if;
      if _w.send_email then
        select email into _email from public.profiles where id = _u and marketing_consent;
        if _email is not null and private.promo_email_allowed(_u)
           and not exists (select 1 from public.marketing_sends s where s.user_id = _u and s.channel = 'email' and s.status = 'in_coda' and s.created_at > now() - make_interval(days => _min)) then
          insert into public.email_outbox (user_id, to_email, template, subject, payload, dedupe_key)
          values (_u, _email, 'marketing', _w.title, jsonb_build_object('title', _w.title, 'body', _w.body, 'link', _w.link, 'unsubscribe_path', '/disiscriviti/' || private.unsubscribe_token(_u)),
                  _u::text || ':wf:' || _w.key || ':' || to_char(now(), 'YYYYMMDD'))
          on conflict (dedupe_key) do nothing;
          insert into public.marketing_sends (workflow_key, user_id, channel, status) values (_w.key, _u, 'email', 'in_coda');
        end if;
      end if;
      _n := _n + 1;
    end loop;
  end loop;
  return _n;
end;
$$;

-- ---------------------------------------------------------------------
-- Growth Center: indicatori reali con filtri (nessun dato personale nei risultati)
-- ---------------------------------------------------------------------
create or replace function public.admin_growth_center(days integer default 30, p_source text default null, p_campaign text default null, p_role text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _since timestamptz := now() - make_interval(days => least(greatest(days, 1), 730));
begin
  if not (private.has_permission('growth.manage') or private.has_permission('analytics.view')) then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return (
    with base as (
      select p.id, p.created_at, p.marketing_consent, a.utm_source, a.utm_campaign, coalesce(a.requested_role, 'non_rilevato') as role, a.referral_code
      from public.profiles p left join public.user_acquisition a on a.user_id = p.id
      where p.created_at >= _since and p.deleted_at is null
        and (p_source is null or coalesce(a.utm_source, 'diretto') = p_source)
        and (p_campaign is null or a.utm_campaign = p_campaign)
        and (p_role is null or a.requested_role = p_role)
    ), act as (
      select b.*, (exists (select 1 from public.requests r where r.requester_id = b.id)
                   or exists (select 1 from public.vehicle_bookings v where v.buyer_id = b.id)
                   or exists (select 1 from public.user_vehicles uv where uv.owner_id = b.id)
                   or exists (select 1 from public.professional_profiles pp where pp.user_id = b.id and pp.is_published)) as activated,
                  exists (select 1 from public.points_ledger l where l.user_id = b.id and l.rule_key in ('servizio_completato', 'revisione_completata', 'soccorso_completato', 'trasporto_completato', 'acquisto_ricambi', 'acquisto_auto', 'appuntamento_completato')) as verified_service,
                  exists (select 1 from public.requests r where r.requester_id = b.id and r.status = 'completata') as completed
      from base b
    )
    select jsonb_build_object(
      'registrazioni', (select count(*) from act),
      'attivati', (select count(*) from act where activated),
      'servizio_completato', (select count(*) from act where completed),
      'consenso_marketing', (select count(*) from act where marketing_consent),
      'per_giorno', (select coalesce(jsonb_agg(jsonb_build_object('giorno', d, 'n', n) order by d), '[]') from (select (created_at at time zone 'Europe/Rome')::date d, count(*) n from act group by 1) x),
      'per_sorgente', (select coalesce(jsonb_agg(jsonb_build_object('sorgente', s, 'n', n, 'attivati', a) order by n desc), '[]') from (select coalesce(utm_source, 'diretto') s, count(*) n, count(*) filter (where activated) a from act group by 1) x),
      'per_campagna', (select coalesce(jsonb_agg(jsonb_build_object('campagna', c, 'n', n, 'attivati', a) order by n desc), '[]') from (select utm_campaign c, count(*) n, count(*) filter (where activated) a from act where utm_campaign is not null group by 1) x),
      'per_ruolo', (select coalesce(jsonb_object_agg(role, n), '{}') from (select role, count(*) n from act group by 1) x),
      'inviti', jsonb_build_object(
        'registrati', (select count(*) from public.referrals r where r.created_at >= _since),
        'qualificati', (select count(*) from public.referrals r where r.created_at >= _since and r.status in ('qualificato', 'premiato')),
        'premiati', (select count(*) from public.referrals r where r.created_at >= _since and r.status = 'premiato'),
        'in_verifica', (select count(*) from public.referrals r where r.status = 'in_verifica'),
        'partner', (select count(*) from public.referrals r where r.created_at >= _since and r.program = 'partner')),
      'email', jsonb_build_object(
        'in_coda', (select count(*) from public.marketing_sends s where s.channel = 'email' and s.status = 'in_coda' and s.created_at >= _since),
        'esclusi', (select count(*) from public.marketing_sends s where s.status = 'escluso' and s.created_at >= _since),
        'inviate_dal_provider', (select count(*) from public.email_outbox o where o.template = 'marketing' and o.status = 'inviata' and o.created_at >= _since),
        'errori', (select count(*) from public.email_outbox o where o.template = 'marketing' and o.status = 'errore' and o.created_at >= _since),
        'disiscrizioni', (select count(*) from public.marketing_consent_log c where not c.consent and c.created_at >= _since and c.source in ('disiscrizione', 'impostazioni'))),
      'automazioni', (select coalesce(jsonb_object_agg(workflow_key, n), '{}') from (select workflow_key, count(*) n from public.marketing_sends where workflow_key is not null and created_at >= _since group by 1) x),
      'sorgenti_disponibili', (select coalesce(jsonb_agg(distinct coalesce(utm_source, 'diretto')), '[]') from public.user_acquisition),
      'campagne_disponibili', (select coalesce(jsonb_agg(distinct utm_campaign), '[]') from public.user_acquisition where utm_campaign is not null)
    ) from (select 1) one
  );
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.user_acquisition enable row level security;
alter table public.landing_pages enable row level security;
alter table public.marketing_consent_log enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;
alter table public.marketing_messages enable row level security;
alter table public.marketing_sends enable row level security;
alter table public.marketing_workflows enable row level security;
revoke all on public.user_acquisition, public.landing_pages, public.marketing_consent_log, public.email_unsubscribe_tokens,
  public.marketing_messages, public.marketing_sends, public.marketing_workflows from anon, authenticated;
grant all on public.user_acquisition, public.landing_pages, public.marketing_consent_log, public.email_unsubscribe_tokens,
  public.marketing_messages, public.marketing_sends, public.marketing_workflows to service_role;

grant select on public.user_acquisition, public.marketing_consent_log, public.marketing_sends to authenticated;
create policy "acquisition: proprio e staff" on public.user_acquisition for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('growth.manage'));
create policy "consent_log: proprio e staff" on public.marketing_consent_log for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('growth.manage'));
create policy "sends: proprio e staff" on public.marketing_sends for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('growth.manage'));

grant select on public.landing_pages to anon, authenticated;
grant insert (slug, title, meta_description, audience, headline, subheadline, body, bullets, cta_label, cta_path, section, variant_b_headline, variant_b_cta_label, experiment_active, campaign_id, indexable, status),
      update (slug, title, meta_description, audience, headline, subheadline, body, bullets, cta_label, cta_path, section, variant_b_headline, variant_b_cta_label, experiment_active, campaign_id, indexable, status)
  on public.landing_pages to authenticated;
create policy "landing: pubblicate" on public.landing_pages for select to anon, authenticated using (status = 'pubblicata');
create policy "landing: staff legge" on public.landing_pages for select to authenticated using (private.has_permission('growth.manage'));
create policy "landing: staff crea" on public.landing_pages for insert to authenticated with check (private.has_permission('growth.manage'));
create policy "landing: staff modifica" on public.landing_pages for update to authenticated using (private.has_permission('growth.manage')) with check (private.has_permission('growth.manage'));

grant select on public.marketing_messages, public.marketing_workflows to authenticated;
grant insert (campaign_id, subject, body, cta_label, cta_path, channels, segment, status),
      update (campaign_id, subject, body, cta_label, cta_path, channels, segment, status) on public.marketing_messages to authenticated;
grant update (title, body, link, delay_days, send_email, max_per_user, cooldown_days, active) on public.marketing_workflows to authenticated;
create policy "messages: staff" on public.marketing_messages for select to authenticated using (private.has_permission('growth.manage'));
create policy "messages: staff crea" on public.marketing_messages for insert to authenticated with check (private.has_permission('growth.manage'));
create policy "messages: staff modifica" on public.marketing_messages for update to authenticated using (private.has_permission('growth.manage')) with check (private.has_permission('growth.manage'));
create policy "workflows: staff" on public.marketing_workflows for select to authenticated using (private.has_permission('growth.manage'));
create policy "workflows: staff modifica" on public.marketing_workflows for update to authenticated using (private.has_permission('growth.manage')) with check (private.has_permission('growth.manage'));

revoke all on function public.marketing_unsubscribe(text) from public;
grant execute on function public.marketing_unsubscribe(text) to anon, authenticated;
do $$
declare _f text;
begin
  foreach _f in array array['public.admin_landing_results(text, integer)', 'public.admin_marketing_audience(jsonb)', 'public.admin_approve_marketing_message(uuid)',
    'public.admin_send_marketing_message(uuid)', 'public.admin_growth_center(integer, text, text, text)'] loop
    execute format('revoke all on function %s from public, anon', _f);
    execute format('grant execute on function %s to authenticated', _f);
  end loop;
end $$;
revoke all on function private.run_marketing_workflows(), private.marketing_audience(jsonb), private.unsubscribe_token(uuid) from public, anon, authenticated;

-- Conservazione: l'attribuzione per utente segue la stessa durata degli eventi (25 mesi).
create or replace function private.purge_analytics()
returns void language sql security definer set search_path = ''
as $$
  delete from public.analytics_events where occurred_at < now() - interval '25 months';
  delete from public.user_acquisition where created_at < now() - interval '25 months';
  delete from public.marketing_sends where created_at < now() - interval '25 months';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-marketing-workflows', '20 10 * * *', 'select private.run_marketing_workflows()');
  end if;
end $$;

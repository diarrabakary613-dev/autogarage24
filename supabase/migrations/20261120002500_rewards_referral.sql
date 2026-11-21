-- =====================================================================
-- Migrazione 0025 — Fase 31: AutoGarage24 Rewards (+ base dei referral)
--
--  * Il saldo NON è una colonna modificabile: è la somma dei movimenti di un registro
--    in sola aggiunta (points_ledger). Ogni movimento ha tipo, causale e origine.
--  * I punti si assegnano solo su eventi confermati da una parte attendibile
--    (professionista, centro, operatore, doppia conferma d'acquisto), mai su richieste
--    soltanto inviate e mai per recensioni.
--  * Ogni regola si assegna al massimo una volta per origine (idempotenza).
--  * Se l'operazione viene annullata dopo l'assegnazione, i punti vengono stornati.
--  * Il programma è DISATTIVATO finché lo staff non lo attiva (regolamento, verifiche
--    fiscali e normative sulle operazioni a premio: DPR 430/2001).
--  * I punti non sono denaro: non sono convertibili, cedibili né prelevabili.
-- =====================================================================

insert into public.platform_settings (key, value, description) values
  ('rewards_enabled', 'false', 'Programma Rewards attivo (assegnazione punti e riscatti). Attivare solo dopo regolamento e verifiche fiscali.'),
  ('rewards_expiry_months', '24', 'Mesi dopo i quali scadono i punti guadagnati e non utilizzati.'),
  ('rewards_tier_window_months', '12', 'Finestra (mesi) dei punti guadagnati che determina il livello.'),
  ('referral_monthly_limit', '20', 'Inviti premiabili al mese per persona: oltre il limite gli inviti vanno in verifica.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Regole, livelli
-- ---------------------------------------------------------------------
create table public.reward_rules (
  key            text primary key check (key ~ '^[a-z_]{3,40}$'),
  label          text not null check (char_length(label) between 3 and 120),
  description    text not null check (char_length(description) between 3 and 500),
  points         integer not null check (points between 0 and 100000),
  active         boolean not null default false,
  tier_bonus     boolean not null default true,
  max_per_user   integer check (max_per_user > 0),
  valid_from     timestamptz,
  valid_to       timestamptz,
  campaign_id    uuid references public.marketing_campaigns (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);

-- Regole del programma (configurazione, non dati: tutte disattivate finché lo staff non le attiva).
insert into public.reward_rules (key, label, description, points, max_per_user, tier_bonus) values
  ('registrazione', 'Benvenuto', 'Registrazione con email confermata.', 50, 1, false),
  ('profilo_completo', 'Profilo completo', 'Nome, telefono, città e foto profilo inseriti.', 50, 1, false),
  ('prima_auto_garage', 'Prima auto nel garage', 'Prima automobile registrata in Il mio Garage.', 30, 1, false),
  ('primo_servizio', 'Primo servizio', 'Primo servizio completato tramite AutoGarage24 (bonus aggiuntivo).', 100, 1, false),
  ('servizio_completato', 'Servizio completato', 'Intervento, preventivo o appuntamento segnato come completato dal professionista.', 100, null, true),
  ('appuntamento_completato', 'Visita o test drive svolto', 'Appuntamento per vedere un''auto segnato come svolto dal venditore.', 30, null, true),
  ('revisione_completata', 'Revisione completata', 'Revisione completata e registrata dal centro.', 50, null, true),
  ('soccorso_completato', 'Assistenza stradale completata', 'Intervento di soccorso concluso.', 30, null, true),
  ('trasporto_completato', 'Trasporto completato', 'Trasporto confermato dal cliente dopo la consegna.', 80, null, true),
  ('acquisto_ricambi', 'Acquisto ricambi', 'Richiesta di ricambi segnata come completata dal venditore.', 50, null, true),
  ('acquisto_auto', 'Acquisto auto verificato', 'Acquisto confermato sia dall''acquirente sia dal venditore.', 500, null, true),
  ('offerta_utilizzata', 'Offerta utilizzata', 'Offerta segnata come utilizzata dal partner.', 30, null, true),
  ('referral_invitante', 'Invito riuscito', 'Una persona invitata ha completato il primo servizio verificato.', 200, null, false),
  ('referral_invitato', 'Benvenuto da un invito', 'Primo servizio verificato dopo la registrazione con un invito valido.', 100, 1, false),
  ('referral_partner', 'Partner invitato attivato', 'Un''attività invitata è stata verificata e pubblicata.', 500, null, false)
on conflict (key) do nothing;

create table public.reward_tiers (
  code        text primary key check (code ~ '^[a-z]{3,20}$'),
  name        text not null,
  min_points  integer not null check (min_points >= 0),
  bonus_pct   integer not null default 0 check (bonus_pct between 0 and 100),
  benefits    text[] not null default '{}',
  sort        integer not null unique
);
insert into public.reward_tiers (code, name, min_points, bonus_pct, benefits, sort) values
  ('bronze', 'Bronze', 0, 0, '{}', 1),
  ('silver', 'Silver', 500, 5, '{"Bonus del 5% sui punti delle attività idonee"}', 2),
  ('gold', 'Gold', 1500, 10, '{"Bonus del 10% sui punti delle attività idonee", "Accesso ai premi riservati Gold"}', 3),
  ('platinum', 'Platinum', 4000, 15, '{"Bonus del 15% sui punti delle attività idonee", "Accesso ai premi riservati Gold e Platinum"}', 4)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Registro dei movimenti (unica fonte del saldo)
-- ---------------------------------------------------------------------
create table public.points_ledger (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  amount         integer not null check (amount <> 0),
  kind           text not null check (kind in ('guadagno', 'riscatto', 'rimborso', 'scadenza', 'storno', 'revoca', 'rettifica')),
  rule_key       text references public.reward_rules (key) on update cascade,
  source_kind    text,
  source_id      uuid,
  redemption_id  uuid,
  expires_at     timestamptz,
  reason         text check (char_length(reason) <= 500),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  check ((kind = 'guadagno') = (amount > 0) or kind in ('rimborso', 'rettifica')),
  check (kind not in ('revoca', 'rettifica') or (reason is not null and char_length(reason) >= 5))
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);
create unique index points_ledger_once on public.points_ledger (user_id, rule_key, source_kind, source_id) where kind = 'guadagno';
create unique index points_ledger_reversal_once on public.points_ledger (user_id, rule_key, source_kind, source_id) where kind = 'storno';
create unique index points_ledger_redeem_once on public.points_ledger (redemption_id, kind) where redemption_id is not null;
create trigger points_ledger_immutable before update or delete on public.points_ledger for each row execute function private.history_immutable();

-- Stato del portafoglio: livello corrente (per le notifiche di passaggio). Il saldo resta derivato.
create table public.rewards_wallets (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  tier_code   text not null default 'bronze' references public.reward_tiers (code) on update cascade,
  updated_at  timestamptz not null default now()
);

create or replace function private.points_balance(_user uuid)
returns integer language sql stable security definer set search_path = ''
as $$ select coalesce(sum(amount), 0)::integer from public.points_ledger where user_id = _user; $$;

create or replace function private.tier_for(_user uuid)
returns public.reward_tiers language sql stable security definer set search_path = ''
as $$
  select t.* from public.reward_tiers t
  where t.min_points <= (select coalesce(sum(l.amount), 0) from public.points_ledger l where l.user_id = _user and l.kind = 'guadagno'
                         and l.created_at > now() - make_interval(months => coalesce((private.setting('rewards_tier_window_months'))::text::integer, 12)))
  order by t.sort desc limit 1;
$$;

-- Assegnazione idempotente; con «qualifies = false» storna i punti se erano stati assegnati.
create or replace function private.rewards_sync(_user uuid, _rule text, _source_kind text, _source_id uuid, _qualifies boolean default true)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.reward_rules%rowtype; _earned public.points_ledger%rowtype; _pts integer; _tier public.reward_tiers; _old text; _count integer;
begin
  if _user is null then return; end if;
  select * into _r from public.reward_rules where key = _rule;
  if not found then return; end if;
  select * into _earned from public.points_ledger where user_id = _user and rule_key = _rule and source_kind = _source_kind and source_id is not distinct from _source_id and kind = 'guadagno';
  if not _qualifies then
    if _earned.id is not null and not exists (select 1 from public.points_ledger where user_id = _user and rule_key = _rule and source_kind = _source_kind
                                              and source_id is not distinct from _source_id and kind = 'storno') then
      insert into public.points_ledger (user_id, amount, kind, rule_key, source_kind, source_id, reason)
      values (_user, -_earned.amount, 'storno', _rule, _source_kind, _source_id, 'Operazione annullata dopo l''assegnazione');
      perform private.notify(_user, 'premi', 'Punti stornati', _earned.amount || ' punti: ' || _r.label || ' (operazione annullata)', '/dashboard/rewards', 'rw-st:' || _earned.id);
    end if;
    return;
  end if;
  if _earned.id is not null then return; end if;
  if coalesce((private.setting('rewards_enabled'))::text, 'false') <> 'true' or not _r.active or _r.points = 0 then return; end if;
  if (_r.valid_from is not null and now() < _r.valid_from) or (_r.valid_to is not null and now() > _r.valid_to) then return; end if;
  if not exists (select 1 from public.profiles p where p.id = _user and p.account_status = 'attivo') then return; end if;
  if _r.max_per_user is not null then
    select count(*) into _count from public.points_ledger where user_id = _user and rule_key = _rule and kind = 'guadagno';
    if _count >= _r.max_per_user then return; end if;
  end if;
  _tier := private.tier_for(_user);
  _pts := _r.points + case when _r.tier_bonus then (_r.points * coalesce(_tier.bonus_pct, 0)) / 100 else 0 end;
  insert into public.points_ledger (user_id, amount, kind, rule_key, source_kind, source_id, expires_at)
  values (_user, _pts, 'guadagno', _rule, _source_kind, _source_id,
          now() + make_interval(months => coalesce((private.setting('rewards_expiry_months'))::text::integer, 24)))
  on conflict do nothing;
  if not found then return; end if;
  perform private.notify(_user, 'premi', '+' || _pts || ' punti AutoGarage24 Rewards', _r.label, '/dashboard/rewards', 'rw:' || _rule || ':' || coalesce(_source_id::text, _source_kind));
  -- Passaggio di livello
  insert into public.rewards_wallets (user_id) values (_user) on conflict do nothing;
  select tier_code into _old from public.rewards_wallets where user_id = _user for update;
  _tier := private.tier_for(_user);
  if _tier.code is distinct from _old then
    update public.rewards_wallets set tier_code = _tier.code, updated_at = now() where user_id = _user;
    if (select sort from public.reward_tiers where code = _tier.code) > (select sort from public.reward_tiers where code = _old) then
      perform private.notify(_user, 'premi', 'Nuovo livello: ' || _tier.name, 'Hai raggiunto il livello ' || _tier.name || ' di AutoGarage24 Rewards.', '/dashboard/rewards', 'rw-tier:' || _user || ':' || _tier.code);
    end if;
  end if;
  -- Primo servizio verificato: bonus e qualificazione dell'eventuale invito.
  if _rule in ('servizio_completato', 'revisione_completata', 'soccorso_completato', 'trasporto_completato', 'acquisto_ricambi', 'acquisto_auto', 'appuntamento_completato') then
    perform private.rewards_sync(_user, 'primo_servizio', 'primo_servizio', null, true);
    perform private.referral_qualify(_user);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Referral (base): codici personali e relazioni invitante/invitato
-- ---------------------------------------------------------------------
create table public.referral_codes (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  code        text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles (id) on delete cascade,
  referred_id   uuid not null unique references public.profiles (id) on delete cascade,
  program       text not null check (program in ('utente', 'partner')),
  code          text not null,
  status        text not null default 'registrato' check (status in ('registrato', 'qualificato', 'premiato', 'in_verifica', 'respinto')),
  signals       text[] not null default '{}',
  qualified_at  timestamptz,
  rewarded_at   timestamptz,
  review_note   text check (char_length(review_note) <= 500),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

-- Email normalizzata (minuscole, senza «+etichetta», punti ignorati per Gmail): per riconoscere account duplicati.
create or replace function private.normalize_email(_email text)
returns text language sql immutable set search_path = ''
as $$
  select case when split_part(lower(_email), '@', 2) in ('gmail.com', 'googlemail.com')
              then replace(split_part(split_part(lower(_email), '@', 1), '+', 1), '.', '') || '@gmail.com'
              else split_part(split_part(lower(_email), '@', 1), '+', 1) || '@' || split_part(lower(_email), '@', 2) end;
$$;

create or replace function public.my_referral_code()
returns text language plpgsql security definer set search_path = ''
as $$
declare _c text;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Accedi per ottenere il tuo codice' using errcode = '42501'; end if;
  select code into _c from public.referral_codes where user_id = auth.uid();
  if _c is not null then return _c; end if;
  loop
    _c := upper(substr(translate(encode(decode(md5(gen_random_uuid()::text), 'hex'), 'base64'), '+/=0O1Il', ''), 1, 8));
    exit when char_length(_c) = 8 and not exists (select 1 from public.referral_codes where code = _c);
  end loop;
  insert into public.referral_codes (user_id, code) values (auth.uid(), _c);
  return _c;
end;
$$;

-- Alla registrazione: collega l'invito se il codice è valido. Controlli antifrode.
create or replace function private.referral_on_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _code text := upper(nullif(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')), '')); _ref uuid; _signals text[] := '{}';
        _role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'cliente'); _ref_email text; _month integer;
begin
  if _code is null or _code !~ '^[A-Z0-9]{6,12}$' then return null; end if;
  select rc.user_id into _ref from public.referral_codes rc join public.profiles p on p.id = rc.user_id
   where rc.code = _code and rc.active and p.account_status = 'attivo';
  if _ref is null or _ref = new.id then return null; end if;
  select email into _ref_email from auth.users where id = _ref;
  if private.normalize_email(_ref_email) = private.normalize_email(new.email) then _signals := array_append(_signals, 'stessa_email_normalizzata'); end if;
  if exists (select 1 from auth.users u where u.id <> new.id and private.normalize_email(u.email) = private.normalize_email(new.email)) then
    _signals := array_append(_signals, 'email_gia_registrata');
  end if;
  select count(*) into _month from public.referrals where referrer_id = _ref and created_at > now() - interval '30 days';
  if _month >= coalesce((private.setting('referral_monthly_limit'))::text::integer, 20) then _signals := array_append(_signals, 'limite_mensile'); end if;
  insert into public.referrals (referrer_id, referred_id, program, code, status, signals)
  values (_ref, new.id, case when _role in ('cliente', 'neopatentato') then 'utente' else 'partner' end, _code,
          case when cardinality(_signals) > 0 then 'in_verifica' else 'registrato' end, _signals)
  on conflict (referred_id) do nothing;
  return null;
end;
$$;
create trigger on_auth_user_created_referral after insert on auth.users for each row execute function private.referral_on_signup();

-- Qualificazione: per gli utenti al primo servizio verificato; per i partner all'attivazione del profilo.
create or replace function private.referral_qualify(_referred uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.referrals%rowtype; _phone_ref text; _phone_new text;
begin
  select * into _r from public.referrals where referred_id = _referred for update;
  if not found or _r.status not in ('registrato') then return; end if;
  select phone into _phone_ref from public.profiles where id = _r.referrer_id;
  select phone into _phone_new from public.profiles where id = _r.referred_id;
  if _phone_ref is not null and regexp_replace(_phone_ref, '\D', '', 'g') = regexp_replace(coalesce(_phone_new, ''), '\D', '', 'g') then
    update public.referrals set status = 'in_verifica', signals = array_append(signals, 'stesso_telefono') where id = _r.id;
    perform private.notify_staff('rewards.manage', 'Invito da verificare', 'Stesso telefono tra invitante e invitato', '/admin/rewards?tab=referral', 'ref-check:' || _r.id);
    return;
  end if;
  update public.referrals set status = 'qualificato', qualified_at = now() where id = _r.id;
  perform private.referral_reward(_r.id);
end;
$$;

create or replace function private.referral_reward(_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.referrals%rowtype;
begin
  select * into _r from public.referrals where id = _id for update;
  if _r.status <> 'qualificato' then return; end if;
  if _r.program = 'utente' then
    perform private.rewards_sync(_r.referrer_id, 'referral_invitante', 'referral', _r.id, true);
    perform private.rewards_sync(_r.referred_id, 'referral_invitato', 'referral', _r.id, true);
  else
    perform private.rewards_sync(_r.referrer_id, 'referral_partner', 'referral', _r.id, true);
  end if;
  if exists (select 1 from public.points_ledger where source_kind = 'referral' and source_id = _r.id and kind = 'guadagno') then
    update public.referrals set status = 'premiato', rewarded_at = now() where id = _r.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Eventi che assegnano punti (solo conferme di una parte attendibile)
-- ---------------------------------------------------------------------
create or replace function private.rw_requests()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _rule text := case when new.kind::text in ('info_ricambio', 'preventivo_ricambio') then 'acquisto_ricambi'
                           when new.kind::text in ('info_auto', 'appuntamento_auto') then null else 'servizio_completato' end;
begin
  if _rule is null then return null; end if;
  if new.status = 'completata' and old.status is distinct from 'completata' then
    perform private.rewards_sync(new.requester_id, _rule, 'richiesta', new.id, true);
  elsif old.status = 'completata' and new.status <> 'completata' then
    perform private.rewards_sync(new.requester_id, _rule, 'richiesta', new.id, false);
  end if;
  return null;
end;
$$;
create trigger requests_rewards after update of status on public.requests for each row execute function private.rw_requests();

create or replace function private.rw_purchase()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _buyer uuid;
begin
  if new.basis = 'acquisto_confermato' and new.verified_at is not null and (tg_op = 'INSERT' or old.verified_at is null) then
    select requester_id into _buyer from public.requests where id = new.request_id;
    perform private.rewards_sync(_buyer, 'acquisto_auto', 'acquisto', new.request_id, true);
  end if;
  return null;
end;
$$;
create trigger review_verifications_rewards after insert or update of verified_at on public.review_verifications for each row execute function private.rw_purchase();

create or replace function private.rw_status_generic()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _user uuid; _rule text; _done text; _kind text := tg_table_name;
begin
  case tg_table_name
    when 'vehicle_bookings' then _user := new.buyer_id; _rule := 'appuntamento_completato'; _done := 'completato';
    when 'inspection_appointments' then _user := new.user_id; _rule := 'revisione_completata'; _done := 'completato';
    when 'roadside_requests' then _user := new.user_id; _rule := 'soccorso_completato'; _done := 'completata';
    when 'transport_requests' then _user := new.user_id; _rule := 'trasporto_completato'; _done := 'completata';
    when 'offer_claims' then _user := new.user_id; _rule := 'offerta_utilizzata'; _done := 'utilizzato';
  end case;
  if new.status = _done and old.status is distinct from _done then
    perform private.rewards_sync(_user, _rule, _kind, new.id, true);
  elsif old.status = _done and new.status <> _done then
    perform private.rewards_sync(_user, _rule, _kind, new.id, false);
  end if;
  return null;
end;
$$;
create trigger vehicle_bookings_rewards after update of status on public.vehicle_bookings for each row execute function private.rw_status_generic();
create trigger inspection_appointments_rewards after update of status on public.inspection_appointments for each row execute function private.rw_status_generic();
create trigger roadside_requests_rewards after update of status on public.roadside_requests for each row execute function private.rw_status_generic();
create trigger transport_requests_rewards after update of status on public.transport_requests for each row execute function private.rw_status_generic();
create trigger offer_claims_rewards after update of status on public.offer_claims for each row execute function private.rw_status_generic();

create or replace function private.rw_email_confirmed()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform private.rewards_sync(new.id, 'registrazione', 'account', new.id, true);
  end if;
  return null;
end;
$$;
create trigger on_auth_user_confirmed_rewards after update of email_confirmed_at on auth.users for each row execute function private.rw_email_confirmed();

create or replace function private.rw_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(char_length(new.full_name), 0) >= 3 and new.phone is not null and new.city is not null and new.avatar_path is not null then
    perform private.rewards_sync(new.id, 'profilo_completo', 'profilo', new.id, true);
  end if;
  return null;
end;
$$;
create trigger profiles_rewards after update of full_name, phone, city, avatar_path on public.profiles for each row execute function private.rw_profile();

create or replace function private.rw_garage()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.rewards_sync(new.owner_id, 'prima_auto_garage', 'garage', null, true);
  return null;
end;
$$;
create trigger user_vehicles_rewards after insert on public.user_vehicles for each row execute function private.rw_garage();

-- Partner invitato: qualificato quando il profilo professionale è pubblicato e approvato.
create or replace function private.rw_partner_activated()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_published and new.review_status = 'approvato' and not (coalesce(old.is_published, false) and old.review_status = 'approvato') then
    perform private.referral_qualify(new.user_id);
  end if;
  return null;
end;
$$;
create trigger professional_profiles_referral after update of is_published, review_status on public.professional_profiles for each row execute function private.rw_partner_activated();

-- ---------------------------------------------------------------------
-- Catalogo premi (esteso dal sistema coupon della Fase 21)
-- ---------------------------------------------------------------------
create table public.reward_items (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.professional_profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 5 and 120),
  description      text not null check (char_length(description) between 20 and 2000),
  image_path       text check (char_length(image_path) <= 300),
  category         text not null check (category in ('officina', 'ricambi', 'manutenzione', 'lavaggio', 'trasporto', 'concessionario', 'altro')),
  points_cost      integer not null check (points_cost between 50 and 1000000),
  benefit_type     text not null check (benefit_type in ('percentuale', 'importo', 'servizio')),
  benefit_value    integer check (benefit_value > 0),
  min_amount_cents integer check (min_amount_cents >= 0),
  conditions       text not null check (char_length(conditions) between 10 and 2000),
  min_tier         text references public.reward_tiers (code) on update cascade,
  quantity_total   integer check (quantity_total > 0),
  quantity_left    integer check (quantity_left >= 0),
  per_user_limit   integer not null default 1 check (per_user_limit between 1 and 20),
  valid_until      date not null,
  voucher_days     integer not null default 60 check (voucher_days between 7 and 365),
  status           text not null default 'bozza' check (status in ('bozza', 'in_revisione', 'pubblicato', 'sospeso', 'rifiutato', 'esaurito', 'scaduto')),
  review_note      text check (char_length(review_note) <= 500),
  reviewed_by      uuid references public.profiles (id) on delete set null,
  published_at     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (benefit_type = 'servizio' or benefit_value is not null),
  check (benefit_type <> 'percentuale' or benefit_value between 1 and 100)
);
create index reward_items_status_idx on public.reward_items (status, points_cost);
create trigger reward_items_updated before update on public.reward_items for each row execute function private.set_updated_at();

create or replace function private.reward_items_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if not (private.owns_profile(new.profile_id) or private.business_can(new.profile_id, 'offerte') or private.has_permission('rewards.manage')) then
    raise exception 'Puoi gestire solo i premi della tua attività' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then new.profile_id := old.profile_id; new.created_by := old.created_by; end if;
  if not private.has_permission('rewards.manage') then
    -- Il partner propone (bozza → in_revisione) o sospende; la pubblicazione è approvata dallo staff.
    if tg_op = 'INSERT' and new.status not in ('bozza', 'in_revisione') then raise exception 'La pubblicazione dei premi è approvata dallo staff' using errcode = '42501'; end if;
    if tg_op = 'UPDATE' and new.status <> old.status and new.status not in ('bozza', 'in_revisione', 'sospeso') then
      raise exception 'La pubblicazione dei premi è approvata dallo staff' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.status = 'pubblicato' and new.status = 'pubblicato'
       and (new.points_cost <> old.points_cost or new.conditions <> old.conditions or new.benefit_value is distinct from old.benefit_value or new.benefit_type <> old.benefit_type) then
      new.status := 'in_revisione';
    end if;
    if tg_op = 'UPDATE' then new.reviewed_by := old.reviewed_by; new.review_note := old.review_note; new.published_at := old.published_at;
    else new.reviewed_by := null; new.review_note := null; new.published_at := null; new.quantity_left := new.quantity_total; end if;
  end if;
  if tg_op = 'UPDATE' and new.quantity_total is distinct from old.quantity_total then
    new.quantity_left := greatest(0, coalesce(old.quantity_left, 0) + coalesce(new.quantity_total, 0) - coalesce(old.quantity_total, 0));
  end if;
  if new.status = 'in_revisione' and (tg_op = 'INSERT' or old.status <> 'in_revisione') then
    perform private.notify_staff('rewards.manage', 'Premio da approvare', new.title, '/admin/rewards?tab=premi', 'rw-item:' || new.id);
  end if;
  return new;
end;
$$;
create trigger reward_items_guard before insert or update on public.reward_items for each row execute function private.reward_items_guard();

-- Voucher personali: estensione dei coupon della Fase 21 (un coupon monouso per riscatto).
create or replace function private.coupons_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then new.code := upper(trim(new.code)); return new; end if;
  new.code := upper(trim(new.code));
  if not private.has_permission('offers.moderate') then
    if not private.owns_profile(new.profile_id) then raise exception 'Profilo non valido' using errcode = '42501'; end if;
    if new.offer_id is not null and not exists (select 1 from public.promotional_offers o where o.id = new.offer_id and o.profile_id = new.profile_id) then
      raise exception 'Offerta non valida' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then new.uses_count := old.uses_count; new.code := old.code; new.profile_id := old.profile_id;
      new.assigned_user_id := old.assigned_user_id; new.reward_redemption_id := old.reward_redemption_id;
    else new.uses_count := 0; new.assigned_user_id := null; new.reward_redemption_id := null; end if;
  end if;
  return new;
end;
$$;
alter table public.promotional_coupons
  add column assigned_user_id uuid references public.profiles (id) on delete cascade,
  add column reward_redemption_id uuid;

create table public.reward_redemptions (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.reward_items (id) on delete restrict,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  profile_id       uuid not null references public.professional_profiles (id) on delete cascade,
  points_spent     integer not null check (points_spent > 0),
  code             text not null unique check (code ~ '^RW-[A-Z0-9]{10}$'),
  coupon_id        uuid references public.promotional_coupons (id) on delete set null,
  status           text not null default 'emesso' check (status in ('emesso', 'utilizzato', 'annullato', 'scaduto', 'revocato')),
  valid_until      date not null,
  idempotency_key  text not null check (char_length(idempotency_key) between 8 and 80),
  used_at          timestamptz,
  used_by          uuid references public.profiles (id) on delete set null,
  cancel_reason    text check (char_length(cancel_reason) <= 500),
  created_at       timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index reward_redemptions_user_idx on public.reward_redemptions (user_id, created_at desc);
create index reward_redemptions_profile_idx on public.reward_redemptions (profile_id, status);
alter table public.promotional_coupons add constraint promotional_coupons_redemption_fk foreign key (reward_redemption_id) references public.reward_redemptions (id) on delete cascade;

-- Un voucher personale vale solo per il suo titolare.
create or replace function private.coupon_owner_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _owner uuid;
begin
  select assigned_user_id into _owner from public.promotional_coupons where id = new.coupon_id;
  if _owner is not null and _owner <> new.user_id then raise exception 'Questo voucher è personale' using errcode = '42501'; end if;
  return new;
end;
$$;
create or replace function private.coupon_used_redemption()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.reward_redemptions r set status = 'utilizzato', used_at = now()
    from public.promotional_coupons c where c.id = new.coupon_id and r.id = c.reward_redemption_id and r.status = 'emesso';
  return null;
end;
$$;
create trigger coupon_redemptions_reward after insert on public.coupon_redemptions for each row execute function private.coupon_used_redemption();
create trigger coupon_redemptions_owner before insert on public.coupon_redemptions for each row execute function private.coupon_owner_guard();

create or replace function public.rewards_wallet()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _u uuid := auth.uid(); _tier public.reward_tiers; _next public.reward_tiers; _window integer;
begin
  if _u is null then raise exception 'Accedi' using errcode = '42501'; end if;
  _tier := private.tier_for(_u);
  select * into _next from public.reward_tiers where sort > _tier.sort order by sort limit 1;
  _window := coalesce((private.setting('rewards_tier_window_months'))::text::integer, 12);
  return jsonb_build_object(
    'enabled', coalesce((private.setting('rewards_enabled'))::text, 'false') = 'true',
    'balance', private.points_balance(_u),
    'earned', (select coalesce(sum(amount), 0) from public.points_ledger where user_id = _u and kind = 'guadagno'),
    'spent', (select coalesce(-sum(amount), 0) from public.points_ledger where user_id = _u and kind = 'riscatto')
             - (select coalesce(sum(amount), 0) from public.points_ledger where user_id = _u and kind = 'rimborso'),
    'expired', (select coalesce(-sum(amount), 0) from public.points_ledger where user_id = _u and kind = 'scadenza'),
    'tier', to_jsonb(_tier), 'next_tier', to_jsonb(_next),
    'tier_points', (select coalesce(sum(amount), 0) from public.points_ledger where user_id = _u and kind = 'guadagno' and created_at > now() - make_interval(months => _window)),
    'tier_window_months', _window,
    'expiring_soon', private.points_expiring(_u, now() + interval '60 days'));
end;
$$;

-- Punti che risulteranno scaduti entro _until: gli addebiti consumano per primi i punti in scadenza
-- (a favore dell'utente); i rimborsi annullano l'addebito; le rettifiche positive non scadono.
create or replace function private.points_expiring(_user uuid, _until timestamptz)
returns integer language sql stable security definer set search_path = ''
as $$
  select greatest(0,
    (select coalesce(sum(amount), 0) from public.points_ledger where user_id = _user and kind = 'guadagno' and expires_at <= _until)
    - (select coalesce(-sum(amount), 0) from public.points_ledger where user_id = _user and amount < 0)
    + (select coalesce(sum(amount), 0) from public.points_ledger where user_id = _user and kind = 'rimborso')
  )::integer;
$$;

create or replace function private.expire_points()
returns void language plpgsql security definer set search_path = ''
as $$
declare _u uuid; _amt integer;
begin
  for _u in select distinct user_id from public.points_ledger where kind = 'guadagno' and expires_at <= now() loop
    _amt := least(private.points_expiring(_u, now()), private.points_balance(_u));
    if _amt > 0 then
      insert into public.points_ledger (user_id, amount, kind, reason) values (_u, -_amt, 'scadenza', 'Punti scaduti dopo il periodo di validità');
      perform private.notify(_u, 'premi', 'Punti scaduti', _amt || ' punti sono scaduti', '/dashboard/rewards', 'rw-exp:' || _u || ':' || current_date);
    end if;
  end loop;
  -- Avviso 30 giorni prima (una volta al mese)
  for _u in select distinct user_id from public.points_ledger where kind = 'guadagno' and expires_at between now() and now() + interval '30 days' loop
    _amt := least(private.points_expiring(_u, now() + interval '30 days'), private.points_balance(_u));
    if _amt > 0 then
      perform private.notify(_u, 'premi', 'Punti in scadenza', _amt || ' punti scadono entro 30 giorni', '/dashboard/rewards', 'rw-soon:' || _u || ':' || to_char(now(), 'YYYY-MM'));
    end if;
  end loop;
  perform set_config('ag24.trusted', 'on', true);
  update public.reward_redemptions set status = 'scaduto' where status = 'emesso' and valid_until < current_date;
  update public.promotional_coupons c set active = false from public.reward_redemptions r where r.coupon_id = c.id and r.status = 'scaduto' and c.active;
  update public.reward_items set status = 'scaduto' where status = 'pubblicato' and valid_until < current_date;
  perform set_config('ag24.trusted', 'off', true);
end;
$$;

-- Riscatto atomico: saldo, disponibilità, condizioni, codice univoco, voucher monouso.
create or replace function public.redeem_reward(item_id uuid, idempotency_key text)
returns table (redemption_id uuid, code text, valid_until date)
language plpgsql security definer set search_path = ''
as $$
declare _u uuid := auth.uid(); _i public.reward_items%rowtype; _bal integer; _id uuid; _code text; _coupon uuid; _until date; _tier public.reward_tiers; _prev public.reward_redemptions%rowtype;
begin
  if _u is null or not private.is_active_user() then raise exception 'Accedi per riscattare' using errcode = '42501'; end if;
  if coalesce((private.setting('rewards_enabled'))::text, 'false') <> 'true' then raise exception 'Il programma Rewards non è ancora attivo' using errcode = '22023'; end if;
  -- Stessa richiesta ripetuta (doppio clic, rete): restituisce il riscatto già fatto.
  select * into _prev from public.reward_redemptions r where r.user_id = _u and r.idempotency_key = redeem_reward.idempotency_key;
  if found then redemption_id := _prev.id; code := _prev.code; valid_until := _prev.valid_until; return next; return; end if;
  insert into public.rewards_wallets (user_id) values (_u) on conflict do nothing;
  perform 1 from public.rewards_wallets where user_id = _u for update;          -- serializza i riscatti dello stesso utente
  select * into _i from public.reward_items where id = item_id for update;      -- serializza la quantità
  if not found or _i.status <> 'pubblicato' then raise exception 'Premio non disponibile' using errcode = 'P0002'; end if;
  if _i.valid_until < current_date then raise exception 'Premio scaduto' using errcode = '22023'; end if;
  if _i.quantity_left is not null and _i.quantity_left <= 0 then raise exception 'Premio esaurito' using errcode = '22023'; end if;
  if (select pp.user_id from public.professional_profiles pp where pp.id = _i.profile_id) = _u then raise exception 'Non puoi riscattare i premi della tua attività' using errcode = '22023'; end if;
  if (select count(*) from public.reward_redemptions r where r.item_id = _i.id and r.user_id = _u and r.status in ('emesso', 'utilizzato')) >= _i.per_user_limit then
    raise exception 'Hai già riscattato questo premio il numero massimo di volte' using errcode = '23505';
  end if;
  if _i.min_tier is not null then
    _tier := private.tier_for(_u);
    if _tier.sort < (select sort from public.reward_tiers where code = _i.min_tier) then raise exception 'Premio riservato al livello %', _i.min_tier using errcode = '42501'; end if;
  end if;
  _bal := private.points_balance(_u);
  if _bal < _i.points_cost then raise exception 'Saldo punti insufficiente: servono % punti, ne hai %', _i.points_cost, _bal using errcode = '22023'; end if;
  perform private.enforce_rate_limit('reward_redeem', 10, interval '1 hour');
  loop
    _code := 'RW-' || upper(substr(regexp_replace(encode(decode(md5(gen_random_uuid()::text), 'hex'), 'base64'), '[^A-Za-z0-9]', '', 'g'), 1, 10));
    exit when char_length(_code) = 13 and not exists (select 1 from public.reward_redemptions where reward_redemptions.code = _code);
  end loop;
  _until := least(_i.valid_until + 30, current_date + _i.voucher_days);
  _id := gen_random_uuid();
  insert into public.reward_redemptions (id, item_id, user_id, profile_id, points_spent, code, valid_until, idempotency_key)
  values (_id, _i.id, _u, _i.profile_id, _i.points_cost, _code, _until, redeem_reward.idempotency_key);
  insert into public.points_ledger (user_id, amount, kind, redemption_id, reason) values (_u, -_i.points_cost, 'riscatto', _id, _i.title);
  perform set_config('ag24.trusted', 'on', true);
  if _i.benefit_type in ('percentuale', 'importo') then
    insert into public.promotional_coupons (profile_id, code, discount_type, discount_value, max_uses, per_user_limit, min_amount_cents, valid_from, valid_until, active, assigned_user_id, reward_redemption_id)
    values (_i.profile_id, _code, _i.benefit_type, _i.benefit_value, 1, 1, _i.min_amount_cents, current_date, _until, true, _u, _id)
    returning id into _coupon;
    update public.reward_redemptions set coupon_id = _coupon where id = _id;
  end if;
  update public.reward_items set quantity_left = case when quantity_left is null then null else quantity_left - 1 end,
         status = case when quantity_left = 1 then 'esaurito' else status end where id = _i.id;
  perform set_config('ag24.trusted', 'off', true);
  perform private.notify(_u, 'premi', 'Premio riscattato: ' || _i.title, 'Il tuo codice è ' || _code || ', valido fino al ' || to_char(_until, 'DD/MM/YYYY'), '/dashboard/rewards?tab=premi', 'rw-red:' || _id);
  perform private.notify((select pp.user_id from public.professional_profiles pp where pp.id = _i.profile_id), 'premi', 'Nuovo premio riscattato', _i.title, '/dashboard/rewards/partner', 'rw-red-p:' || _id);
  redemption_id := _id; code := _code; valid_until := _until; return next;
end;
$$;

-- Verifica e utilizzo del codice da parte del partner (solo i propri premi).
create or replace function public.verify_reward_code(p_code text)
returns table (redemption_id uuid, item_title text, benefit_type text, benefit_value integer, conditions text, status text, valid_until date, customer_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  select r.id, i.title, i.benefit_type, i.benefit_value, i.conditions,
         case when r.status = 'emesso' and r.valid_until < current_date then 'scaduto' else r.status end, r.valid_until,
         coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Cliente')
  from public.reward_redemptions r join public.reward_items i on i.id = r.item_id left join public.profiles p on p.id = r.user_id
  where r.code = upper(trim(p_code)) and (private.owns_profile(r.profile_id) or private.business_can(r.profile_id, 'offerte'));
end;
$$;

create or replace function public.use_reward_code(p_code text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.reward_redemptions%rowtype;
begin
  select * into _r from public.reward_redemptions where code = upper(trim(p_code)) for update;
  if not found or not (private.owns_profile(_r.profile_id) or private.business_can(_r.profile_id, 'offerte')) then raise exception 'Codice non trovato' using errcode = 'P0002'; end if;
  if _r.status <> 'emesso' then raise exception 'Codice già % ', _r.status using errcode = '23505'; end if;
  if _r.valid_until < current_date then raise exception 'Codice scaduto' using errcode = '22023'; end if;
  update public.reward_redemptions set status = 'utilizzato', used_at = now(), used_by = auth.uid() where id = _r.id;
  perform set_config('ag24.trusted', 'on', true);
  if _r.coupon_id is not null then update public.promotional_coupons set uses_count = max_uses, active = false where id = _r.coupon_id; end if;
  perform set_config('ag24.trusted', 'off', true);
  perform private.notify(_r.user_id, 'premi', 'Premio utilizzato', 'Il codice ' || _r.code || ' è stato utilizzato presso il partner', '/dashboard/rewards?tab=premi', 'rw-used:' || _r.id);
end;
$$;

-- Annullamento di un voucher non utilizzato: i punti tornano all'utente (rimborso).
create or replace function public.cancel_reward_redemption(redemption_id uuid, reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _r public.reward_redemptions%rowtype; _who text;
begin
  select * into _r from public.reward_redemptions where id = redemption_id for update;
  if not found then raise exception 'Riscatto non trovato' using errcode = 'P0002'; end if;
  if _r.user_id = auth.uid() then _who := 'utente';
  elsif private.owns_profile(_r.profile_id) or private.business_can(_r.profile_id, 'offerte') then _who := 'partner';
  elsif private.has_permission('rewards.manage') then _who := 'staff';
  else raise exception 'Riscatto non trovato' using errcode = 'P0002'; end if;
  if _r.status <> 'emesso' then raise exception 'Solo i codici non ancora utilizzati possono essere annullati' using errcode = '22023'; end if;
  if _who <> 'utente' and coalesce(trim(reason), '') = '' then raise exception 'Indica il motivo' using errcode = '22023'; end if;
  update public.reward_redemptions set status = 'annullato', cancel_reason = coalesce(nullif(trim(reason), ''), 'Annullato dall''utente') where id = _r.id;
  perform set_config('ag24.trusted', 'on', true);
  if _r.coupon_id is not null then update public.promotional_coupons set active = false where id = _r.coupon_id; end if;
  insert into public.points_ledger (user_id, amount, kind, redemption_id, reason, created_by) values (_r.user_id, _r.points_spent, 'rimborso', _r.id, 'Riscatto annullato', auth.uid());
  update public.reward_items set quantity_left = quantity_left + 1, status = case when status = 'esaurito' then 'pubblicato' else status end
   where id = _r.item_id and quantity_left is not null;
  perform set_config('ag24.trusted', 'off', true);
  if _who <> 'utente' then
    perform private.notify(_r.user_id, 'premi', 'Riscatto annullato: punti restituiti', _r.points_spent || ' punti · ' || trim(reason), '/dashboard/rewards', 'rw-cancel:' || _r.id);
  end if;
  if _who = 'staff' then perform private.log_admin_action('rewards.cancel_redemption', 'reward_redemptions', _r.id::text, jsonb_build_object('reason', reason)); end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Amministrazione
-- ---------------------------------------------------------------------
insert into public.role_permissions (role, permission)
select r::public.app_role, 'rewards.manage' from unnest(array['admin', 'super_admin']) r on conflict do nothing;

create or replace function public.admin_adjust_points(user_id uuid, amount integer, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('rewards.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if amount = 0 or abs(amount) > 100000 then raise exception 'Importo non valido' using errcode = '22023'; end if;
  if coalesce(char_length(trim(reason)), 0) < 10 then raise exception 'La motivazione è obbligatoria (almeno 10 caratteri)' using errcode = '22023'; end if;
  if user_id = auth.uid() then raise exception 'Non puoi rettificare il tuo saldo' using errcode = '42501'; end if;
  insert into public.points_ledger (user_id, amount, kind, reason, created_by) values (admin_adjust_points.user_id, amount, 'rettifica', trim(reason), auth.uid());
  perform private.log_admin_action('rewards.adjust', 'points_ledger', user_id::text, jsonb_build_object('amount', amount, 'reason', reason));
  perform private.notify(user_id, 'premi', case when amount > 0 then 'Punti accreditati dallo staff' else 'Rettifica del saldo punti' end, amount || ' punti · ' || trim(reason), '/dashboard/rewards', 'rw-adj:' || now()::text);
end;
$$;

-- Revoca di un accredito fraudolento (storno con motivazione e audit).
create or replace function public.admin_revoke_points(ledger_id bigint, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _l public.points_ledger%rowtype;
begin
  if not private.has_permission('rewards.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if coalesce(char_length(trim(reason)), 0) < 10 then raise exception 'La motivazione è obbligatoria (almeno 10 caratteri)' using errcode = '22023'; end if;
  select * into _l from public.points_ledger where id = ledger_id;
  if not found or _l.kind <> 'guadagno' then raise exception 'Si possono revocare solo accrediti' using errcode = '22023'; end if;
  if exists (select 1 from public.points_ledger where user_id = _l.user_id and kind in ('revoca', 'storno') and rule_key is not distinct from _l.rule_key
             and source_kind is not distinct from _l.source_kind and source_id is not distinct from _l.source_id) then
    raise exception 'Accredito già revocato' using errcode = '23505';
  end if;
  insert into public.points_ledger (user_id, amount, kind, rule_key, source_kind, source_id, reason, created_by)
  values (_l.user_id, -_l.amount, 'revoca', _l.rule_key, _l.source_kind, _l.source_id, trim(reason), auth.uid());
  perform private.log_admin_action('rewards.revoke', 'points_ledger', ledger_id::text, jsonb_build_object('user_id', _l.user_id, 'amount', _l.amount, 'reason', reason));
  perform private.notify(_l.user_id, 'premi', 'Punti revocati', _l.amount || ' punti · ' || trim(reason), '/dashboard/rewards', 'rw-rev:' || ledger_id);
end;
$$;

create or replace function public.admin_review_reward_item(item_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _i public.reward_items%rowtype;
begin
  if not private.has_permission('rewards.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if decision not in ('pubblicato', 'rifiutato', 'sospeso', 'in_revisione') then raise exception 'Decisione non valida' using errcode = '22023'; end if;
  if decision in ('rifiutato', 'sospeso') and coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  update public.reward_items set status = decision, review_note = nullif(trim(note), ''), reviewed_by = auth.uid(),
    published_at = case when decision = 'pubblicato' then coalesce(published_at, now()) else published_at end
   where id = item_id returning * into _i;
  if _i.id is null then raise exception 'Premio non trovato' using errcode = 'P0002'; end if;
  perform private.notify((select user_id from public.professional_profiles where id = _i.profile_id), 'premi',
    case decision when 'pubblicato' then 'Premio pubblicato' else 'Premio: ' || decision end, coalesce(nullif(trim(note), ''), _i.title), '/dashboard/rewards/partner', 'rw-rev-item:' || _i.id || ':' || decision);
  perform private.log_admin_action('rewards.item_' || decision, 'reward_items', _i.id::text, jsonb_build_object('note', note));
end;
$$;

create or replace function public.admin_review_referral(referral_id uuid, decision text, note text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('rewards.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if decision not in ('registrato', 'respinto') then raise exception 'Decisione non valida' using errcode = '22023'; end if;
  if coalesce(char_length(trim(note)), 0) < 5 then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  update public.referrals set status = decision, review_note = trim(note), reviewed_by = auth.uid() where id = referral_id and status in ('in_verifica', 'registrato');
  if not found then raise exception 'Invito non trovato o già concluso' using errcode = 'P0002'; end if;
  perform private.log_admin_action('referral.' || decision, 'referrals', referral_id::text, jsonb_build_object('note', note));
end;
$$;

create or replace function public.admin_rewards_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('rewards.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'enabled', coalesce((private.setting('rewards_enabled'))::text, 'false') = 'true',
    'punti_assegnati', (select coalesce(sum(amount), 0) from public.points_ledger where kind = 'guadagno'),
    'punti_riscattati', (select coalesce(-sum(amount), 0) from public.points_ledger where kind = 'riscatto'),
    'punti_in_circolazione', (select coalesce(sum(amount), 0) from public.points_ledger),
    'partecipanti', (select count(distinct user_id) from public.points_ledger),
    'premi_pubblicati', (select count(*) from public.reward_items where status = 'pubblicato'),
    'premi_da_approvare', (select count(*) from public.reward_items where status = 'in_revisione'),
    'riscatti', (select count(*) from public.reward_redemptions),
    'riscatti_utilizzati', (select count(*) from public.reward_redemptions where status = 'utilizzato'),
    'inviti', (select count(*) from public.referrals),
    'inviti_in_verifica', (select count(*) from public.referrals where status = 'in_verifica'),
    'per_regola', (select coalesce(jsonb_object_agg(rule_key, n), '{}'::jsonb) from (select rule_key, sum(amount) n from public.points_ledger where kind = 'guadagno' group by 1) x),
    'per_livello', (select coalesce(jsonb_object_agg(tier_code, n), '{}'::jsonb) from (select tier_code, count(*) n from public.rewards_wallets group by 1) x));
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.reward_rules enable row level security;
alter table public.reward_tiers enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards_wallets enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_redemptions enable row level security;
revoke all on public.reward_rules, public.reward_tiers, public.points_ledger, public.rewards_wallets, public.referral_codes, public.referrals,
  public.reward_items, public.reward_redemptions from anon, authenticated;
grant all on public.reward_rules, public.reward_tiers, public.points_ledger, public.rewards_wallets, public.referral_codes, public.referrals,
  public.reward_items, public.reward_redemptions to service_role;

grant select on public.reward_rules, public.reward_tiers to anon, authenticated;
grant update (label, description, points, active, tier_bonus, max_per_user, valid_from, valid_to, campaign_id) on public.reward_rules to authenticated;
grant update (name, min_points, bonus_pct, benefits) on public.reward_tiers to authenticated;
create policy "reward_rules: lettura" on public.reward_rules for select to anon, authenticated using (true);
create policy "reward_rules: staff" on public.reward_rules for update to authenticated using (private.has_permission('rewards.manage')) with check (private.has_permission('rewards.manage'));
create policy "reward_tiers: lettura" on public.reward_tiers for select to anon, authenticated using (true);
create policy "reward_tiers: staff" on public.reward_tiers for update to authenticated using (private.has_permission('rewards.manage')) with check (private.has_permission('rewards.manage'));

grant select on public.points_ledger, public.rewards_wallets, public.referral_codes, public.referrals, public.reward_redemptions to authenticated;
create policy "ledger: proprio e staff" on public.points_ledger for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('rewards.manage'));
create policy "wallets: proprio e staff" on public.rewards_wallets for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('rewards.manage'));
create policy "referral_codes: proprio" on public.referral_codes for select to authenticated using (user_id = (select auth.uid()) or private.has_permission('rewards.manage'));
create policy "referrals: invitante e staff" on public.referrals for select to authenticated using (referrer_id = (select auth.uid()) or private.has_permission('rewards.manage'));
create policy "redemptions: titolare, partner, staff" on public.reward_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_profile(profile_id) or private.business_can(profile_id, 'offerte') or private.has_permission('rewards.manage'));

grant select on public.reward_items to anon, authenticated;
grant insert (profile_id, title, description, image_path, category, points_cost, benefit_type, benefit_value, min_amount_cents, conditions, min_tier, quantity_total, per_user_limit, valid_until, voucher_days, status),
      update (title, description, image_path, category, points_cost, benefit_type, benefit_value, min_amount_cents, conditions, min_tier, quantity_total, per_user_limit, valid_until, voucher_days, status)
  on public.reward_items to authenticated;
create policy "reward_items: pubblicati" on public.reward_items for select to anon, authenticated using (status = 'pubblicato' and valid_until >= current_date);
create policy "reward_items: partner" on public.reward_items for select to authenticated using (private.owns_profile(profile_id) or private.business_can(profile_id, 'offerte') or private.has_permission('rewards.manage'));
create policy "reward_items: crea" on public.reward_items for insert to authenticated with check (private.owns_profile(profile_id) or private.business_can(profile_id, 'offerte') or private.has_permission('rewards.manage'));
create policy "reward_items: modifica" on public.reward_items for update to authenticated
  using (private.owns_profile(profile_id) or private.business_can(profile_id, 'offerte') or private.has_permission('rewards.manage'))
  with check (private.owns_profile(profile_id) or private.business_can(profile_id, 'offerte') or private.has_permission('rewards.manage'));

do $$
declare _f text;
begin
  foreach _f in array array['public.my_referral_code()', 'public.rewards_wallet()', 'public.redeem_reward(uuid, text)', 'public.verify_reward_code(text)', 'public.use_reward_code(text)',
    'public.cancel_reward_redemption(uuid, text)', 'public.admin_adjust_points(uuid, integer, text)', 'public.admin_revoke_points(bigint, text)',
    'public.admin_review_reward_item(uuid, text, text)', 'public.admin_review_referral(uuid, text, text)', 'public.admin_rewards_stats()'] loop
    execute format('revoke all on function %s from public, anon', _f);
    execute format('grant execute on function %s to authenticated', _f);
  end loop;
end $$;
revoke all on function private.rewards_sync(uuid, text, text, uuid, boolean), private.expire_points(), private.referral_qualify(uuid), private.referral_reward(uuid) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-rewards-expiry', '15 3 * * *', 'select private.expire_points()');
  end if;
end $$;

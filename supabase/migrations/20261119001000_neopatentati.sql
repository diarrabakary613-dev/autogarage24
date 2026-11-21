-- =====================================================================
-- AutoGarage24 — Migrazione 0010 (Fase 4): regole neopatentati
-- versionate, verifiche di compatibilità storicizzate, profilo guidatore.
-- Fonti e date: docs/NEOPATENTATI_LEGISLAZIONE.md
-- =====================================================================

create type public.neo_result as enum ('compatibile', 'non_compatibile', 'da_verificare');
create type public.rule_status as enum ('bozza', 'pubblicata', 'archiviata');

create table public.legal_rules (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z0-9_]+$'),
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table public.legal_rule_versions (
  id                      uuid primary key default gen_random_uuid(),
  rule_id                 uuid not null references public.legal_rules (id) on delete restrict,
  version_label           text not null check (char_length(version_label) between 1 and 60),
  status                  public.rule_status not null default 'bozza',
  license_obtained_from   date,
  license_obtained_to     date,
  effective_from          date not null,
  effective_to            date,
  params                  jsonb not null,
  exceptions              jsonb not null default '[]'::jsonb,
  sources                 jsonb not null default '[]'::jsonb,
  consulted_on            date,
  reason                  text check (char_length(reason) <= 2000),
  test_results            jsonb,
  tested_at               timestamptz,
  created_by              uuid references public.profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  published_by            uuid references public.profiles (id) on delete set null,
  published_at            timestamptz,
  unique (rule_id, version_label),
  check (license_obtained_to is null or license_obtained_from is null or license_obtained_to >= license_obtained_from),
  check (jsonb_typeof(params) = 'object' and jsonb_typeof(sources) = 'array' and jsonb_typeof(exceptions) = 'array')
);
comment on table public.legal_rule_versions is
  'Versioni delle regole neopatentati. Una versione pubblicata non si modifica: se ne crea una nuova.';

-- Le versioni pubblicate sono immutabili (salvo archiviazione).
create or replace function private.rule_versions_immutable()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status = 'pubblicata' and (new.params, new.license_obtained_from, new.license_obtained_to, new.effective_from, new.sources)
       is distinct from (old.params, old.license_obtained_from, old.license_obtained_to, old.effective_from, old.sources) then
    raise exception 'Una versione pubblicata non può essere modificata: crea una nuova versione' using errcode = '42501';
  end if;
  if old.status = 'archiviata' and new.status <> 'archiviata' then
    raise exception 'Una versione archiviata non può essere ripristinata' using errcode = '42501';
  end if;
  if new.status = 'bozza' and old.status = 'bozza' and new.params is distinct from old.params then
    new.test_results := null; new.tested_at := null; -- ogni modifica richiede un nuovo test
  end if;
  return new;
end;
$$;
create trigger legal_rule_versions_immutable before update on public.legal_rule_versions
  for each row execute function private.rule_versions_immutable();

create table public.vehicle_compatibility_checks (
  id               bigint generated always as identity primary key,
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  rule_version_id  uuid not null references public.legal_rule_versions (id) on delete restrict,
  result           public.neo_result not null,
  details          jsonb not null,
  checked_at       timestamptz not null default now(),
  checked_by       uuid references public.profiles (id) on delete set null
);
create index vehicle_compatibility_checks_vehicle_idx on public.vehicle_compatibility_checks (vehicle_id, checked_at desc);

alter table public.vehicle_listings
  add column neo_result            public.neo_result,
  add column neo_checked_at        timestamptz,
  add column neo_rule_version_id   uuid references public.legal_rule_versions (id) on delete set null;
create index vehicle_listings_neo_idx on public.vehicle_listings (neo_result) where status = 'pubblicato';

create table public.driver_profiles (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  license_obtained_on   date check (license_obtained_on >= '1950-01-01'),
  license_category      text not null default 'B' check (license_category in ('B', 'B96', 'BE', 'altra')),
  budget_max_cents      bigint check (budget_max_cents > 0 and budget_max_cents < 100000000000),
  city_interest         text check (char_length(city_interest) <= 80),
  preferences           jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);
comment on table public.driver_profiles is 'Dati del neopatentato: visibili e modificabili solo dal titolare.';
create trigger driver_profiles_set_updated_at before update on public.driver_profiles for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Motore di valutazione (stessa logica di src/lib/neopatentati/engine.ts)
-- ---------------------------------------------------------------------
create or replace function private.evaluate_neo(_v public.vehicles, _params jsonb)
returns jsonb language plpgsql immutable set search_path = ''
as $$
declare
  _max_ratio numeric := (_params ->> 'max_power_to_tare_kw_t')::numeric;
  _max_power numeric := (_params ->> 'max_power_kw')::numeric;
  _margin numeric := coalesce((_params ->> 'borderline_margin_pct')::numeric, 0) / 100;
  _power_cats jsonb := coalesce(_params -> 'max_power_kw_categories', '["M1"]'::jsonb);
  _doc_fuels jsonb := coalesce(_params -> 'documented_ratio_required_for_fuels', '[]'::jsonb);
  _ratio numeric;
  _ratio_source text;
  _missing text[] := '{}';
  _reasons text[] := '{}';
  _non_compatible boolean := false;
  _uncertain boolean := false;
begin
  if _v.power_kw is null then
    _missing := array_append(_missing, 'potenza (kW)'::text);
  elsif _max_power is not null and _power_cats ? coalesce(_v.vehicle_category, 'M1') then
    if _v.power_kw > _max_power then
      _non_compatible := true;
      _reasons := _reasons || format('Potenza %s kW superiore al limite di %s kW', _v.power_kw, _max_power);
    else
      _reasons := _reasons || format('Potenza %s kW entro il limite di %s kW', _v.power_kw, _max_power);
    end if;
  end if;

  if _v.power_to_tare_documented is not null then
    _ratio := _v.power_to_tare_documented; _ratio_source := 'documentato';
  elsif _v.power_kw is not null and _v.tare_kg is not null then
    _ratio := round(_v.power_kw / (_v.tare_kg::numeric / 1000), 2); _ratio_source := 'calcolato';
  else
    _missing := array_append(_missing, 'tara o rapporto potenza/tara'::text);
  end if;

  if _v.fuel is not null and _doc_fuels ? _v.fuel::text and _v.power_to_tare_documented is null then
    _missing := array_append(_missing, 'rapporto potenza/tara documentato (richiesto per elettriche e ibride plug-in)'::text);
  end if;

  if _ratio is not null and _max_ratio is not null then
    if _ratio_source = 'calcolato' and _ratio > _max_ratio * (1 - _margin) and _ratio <= _max_ratio * (1 + _margin) then
      _uncertain := true;
      _reasons := _reasons || format('Rapporto potenza/tara calcolato %s kW/t, troppo vicino al limite di %s kW/t per un esito certo', _ratio, _max_ratio);
    elsif _ratio > _max_ratio then
      _non_compatible := true;
      _reasons := _reasons || format('Rapporto potenza/tara %s kW/t (%s) superiore al limite di %s kW/t', _ratio, _ratio_source, _max_ratio);
    else
      _reasons := _reasons || format('Rapporto potenza/tara %s kW/t (%s) entro il limite di %s kW/t', _ratio, _ratio_source, _max_ratio);
    end if;
  end if;

  return jsonb_build_object(
    'result', case when _non_compatible then 'non_compatibile'
                   when _uncertain or cardinality(_missing) > 0 then 'da_verificare'
                   else 'compatibile' end,
    'ratio', _ratio, 'ratio_source', _ratio_source, 'power_kw', _v.power_kw, 'tare_kg', _v.tare_kg,
    'max_power_kw', _max_power, 'max_power_to_tare_kw_t', _max_ratio,
    'reasons', to_jsonb(_reasons), 'missing', to_jsonb(_missing));
end;
$$;

-- Versione in vigore per chi consegue la patente oggi (usata per gli annunci).
create or replace function private.current_neo_rule_version()
returns public.legal_rule_versions language sql stable security definer set search_path = ''
as $$
  select v.* from public.legal_rule_versions v
  join public.legal_rules r on r.id = v.rule_id and r.code = 'neopatentati_potenza_b'
  where v.status = 'pubblicata'
    and v.effective_from <= current_date and (v.effective_to is null or v.effective_to >= current_date)
    and (v.license_obtained_from is null or v.license_obtained_from <= current_date)
    and (v.license_obtained_to is null or v.license_obtained_to >= current_date)
  order by v.effective_from desc limit 1;
$$;

-- Ricalcola e storicizza la verifica di un veicolo (solo se l'esito cambia).
create or replace function private.recheck_vehicle(_vehicle_id uuid)
returns public.neo_result language plpgsql security definer set search_path = ''
as $$
declare
  _v public.vehicles%rowtype;
  _rule public.legal_rule_versions%rowtype;
  _eval jsonb;
  _last public.vehicle_compatibility_checks%rowtype;
begin
  select * into _v from public.vehicles where id = _vehicle_id;
  if not found then return null; end if;
  _rule := private.current_neo_rule_version();
  if _rule.id is null then return null; end if;
  _eval := private.evaluate_neo(_v, _rule.params);
  select * into _last from public.vehicle_compatibility_checks
   where vehicle_id = _vehicle_id order by checked_at desc, id desc limit 1;
  if _last.id is null or _last.rule_version_id <> _rule.id or _last.details <> _eval then
    insert into public.vehicle_compatibility_checks (vehicle_id, rule_version_id, result, details, checked_by)
    values (_vehicle_id, _rule.id, (_eval ->> 'result')::public.neo_result, _eval, (select auth.uid()));
  end if;
  update public.vehicle_listings
     set neo_result = (_eval ->> 'result')::public.neo_result, neo_checked_at = now(), neo_rule_version_id = _rule.id
   where vehicle_id = _vehicle_id;
  return (_eval ->> 'result')::public.neo_result;
end;
$$;

create or replace function private.vehicles_recheck_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.recheck_vehicle(new.id);
  return null;
end;
$$;
create trigger vehicles_neo_recheck after insert or update of power_kw, tare_kg, power_to_tare_documented, fuel, vehicle_category
  on public.vehicles for each row execute function private.vehicles_recheck_trigger();

create or replace function private.listing_neo_on_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.recheck_vehicle(new.vehicle_id);
  return null;
end;
$$;
create trigger vehicle_listings_neo_on_insert after insert on public.vehicle_listings
  for each row execute function private.listing_neo_on_insert();

-- ---------------------------------------------------------------------
-- Funzioni amministrative: test e pubblicazione delle versioni
-- ---------------------------------------------------------------------
create or replace function public.admin_test_rule_version(version_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  _ver public.legal_rule_versions%rowtype;
  _summary jsonb;
begin
  if not private.has_permission('neo_rules.manage') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  select * into _ver from public.legal_rule_versions where id = version_id;
  if not found then raise exception 'Versione non trovata' using errcode = 'P0002'; end if;

  -- Confronto con la versione in vigore sui veicoli degli annunci aperti.
  with evals as (
    select l.id as listing_id, l.title, l.neo_result as current_result,
           (private.evaluate_neo(v, _ver.params) ->> 'result') as new_result
    from public.vehicle_listings l join public.vehicles v on v.id = l.vehicle_id
    where l.status in ('pubblicato', 'in_revisione', 'approvato')
  )
  select jsonb_build_object(
    'tested_at', now(),
    'total', count(*),
    'by_result', jsonb_build_object(
       'compatibile', count(*) filter (where new_result = 'compatibile'),
       'non_compatibile', count(*) filter (where new_result = 'non_compatibile'),
       'da_verificare', count(*) filter (where new_result = 'da_verificare')),
    'changes', coalesce(jsonb_agg(jsonb_build_object('listing_id', listing_id, 'title', title,
                 'from', current_result, 'to', new_result)) filter (where current_result::text is distinct from new_result), '[]'::jsonb)
  ) into _summary from evals;

  update public.legal_rule_versions set test_results = _summary, tested_at = now() where id = version_id;
  perform private.log_admin_action('neo_rule.tested', 'legal_rule_versions', version_id::text, jsonb_build_object('total', _summary -> 'total'));
  return _summary;
end;
$$;

create or replace function public.admin_publish_rule_version(version_id uuid, publish_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _ver public.legal_rule_versions%rowtype; _vid uuid;
begin
  if not private.has_permission('neo_rules.manage') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  select * into _ver from public.legal_rule_versions where id = version_id for update;
  if not found then raise exception 'Versione non trovata' using errcode = 'P0002'; end if;
  if _ver.status <> 'bozza' then raise exception 'Solo una bozza può essere pubblicata' using errcode = '22023'; end if;
  if _ver.tested_at is null then raise exception 'Esegui il test della versione prima di pubblicarla' using errcode = '22023'; end if;
  if jsonb_array_length(_ver.sources) = 0 or _ver.consulted_on is null then
    raise exception 'Indica almeno una fonte ufficiale e la data di consultazione' using errcode = '22023';
  end if;
  if coalesce(trim(publish_reason), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  if not (_ver.params ? 'max_power_to_tare_kw_t' and _ver.params ? 'duration_months') then
    raise exception 'Parametri incompleti' using errcode = '22023';
  end if;

  update public.legal_rule_versions
     set status = 'pubblicata', published_by = (select auth.uid()), published_at = now(), reason = publish_reason
   where id = version_id;

  -- Ricalcolo degli annunci aperti con la versione ora in vigore.
  for _vid in select l.vehicle_id from public.vehicle_listings l where l.status in ('pubblicato', 'in_revisione', 'approvato', 'sospeso') loop
    perform private.recheck_vehicle(_vid);
  end loop;
  perform private.log_admin_action('neo_rule.published', 'legal_rule_versions', version_id::text,
    jsonb_build_object('label', _ver.version_label, 'reason', publish_reason));
end;
$$;

create or replace function public.admin_archive_rule_version(version_id uuid, archive_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('neo_rules.manage') then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  if coalesce(trim(archive_reason), '') = '' then raise exception 'Indica la motivazione' using errcode = '22023'; end if;
  update public.legal_rule_versions set status = 'archiviata', effective_to = coalesce(effective_to, current_date)
   where id = version_id and status = 'pubblicata';
  perform private.log_admin_action('neo_rule.archived', 'legal_rule_versions', version_id::text, jsonb_build_object('reason', archive_reason));
end;
$$;

-- Verifica on-demand di un veicolo (pubblico) — usata dalla scheda auto.
create or replace function public.evaluate_listing_neo(listing_slug text)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare _v public.vehicles%rowtype; _rule public.legal_rule_versions%rowtype;
begin
  select v.* into _v from public.vehicle_listings l join public.vehicles v on v.id = l.vehicle_id where l.slug = listing_slug;
  if not found then return null; end if;
  _rule := private.current_neo_rule_version();
  if _rule.id is null then return null; end if;
  return private.evaluate_neo(_v, _rule.params) || jsonb_build_object('rule_version_id', _rule.id, 'rule_label', _rule.version_label);
end;
$$;
grant execute on function public.evaluate_listing_neo(text) to anon, authenticated;

revoke all on function public.admin_test_rule_version(uuid), public.admin_publish_rule_version(uuid, text),
  public.admin_archive_rule_version(uuid, text) from public, anon;
grant execute on function public.admin_test_rule_version(uuid), public.admin_publish_rule_version(uuid, text),
  public.admin_archive_rule_version(uuid, text) to authenticated;
grant execute on function private.current_neo_rule_version() to anon, authenticated, service_role;
grant execute on function private.evaluate_neo(public.vehicles, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.legal_rules enable row level security;
alter table public.legal_rule_versions enable row level security;
alter table public.vehicle_compatibility_checks enable row level security;
alter table public.driver_profiles enable row level security;
revoke all on table public.legal_rules, public.legal_rule_versions, public.vehicle_compatibility_checks, public.driver_profiles
  from anon, authenticated;
grant all on table public.legal_rules, public.legal_rule_versions, public.vehicle_compatibility_checks, public.driver_profiles
  to service_role;

grant select on table public.legal_rules, public.legal_rule_versions to anon, authenticated;
create policy "legal_rules: lettura pubblica" on public.legal_rules for select to anon, authenticated using (true);
create policy "rule_versions: lettura pubblica delle pubblicate" on public.legal_rule_versions for select to anon, authenticated
  using (status in ('pubblicata', 'archiviata'));
create policy "rule_versions: lettura gestori" on public.legal_rule_versions for select to authenticated
  using ((select private.has_permission('neo_rules.manage')));
grant insert on table public.legal_rule_versions to authenticated;
grant update (version_label, license_obtained_from, license_obtained_to, effective_from, effective_to, params, exceptions,
              sources, consulted_on, reason) on table public.legal_rule_versions to authenticated;
create policy "rule_versions: creazione bozze" on public.legal_rule_versions for insert to authenticated
  with check ((select private.has_permission('neo_rules.manage')) and status = 'bozza' and created_by = (select auth.uid()));
create policy "rule_versions: modifica bozze" on public.legal_rule_versions for update to authenticated
  using ((select private.has_permission('neo_rules.manage')) and status = 'bozza')
  with check ((select private.has_permission('neo_rules.manage')));

grant select on table public.vehicle_compatibility_checks to anon, authenticated;
create policy "compat_checks: lettura per veicoli pubblici" on public.vehicle_compatibility_checks for select to anon, authenticated
  using (private.vehicle_is_public(vehicle_id));
create policy "compat_checks: lettura titolare e staff" on public.vehicle_compatibility_checks for select to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
         or (select private.has_permission('listings.moderate')));

grant select, insert, update, delete on table public.driver_profiles to authenticated;
create policy "driver_profiles: solo titolare" on public.driver_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Regole iniziali (verificate il 19/11/2026, vedi documentazione)
-- ---------------------------------------------------------------------
with r as (
  insert into public.legal_rules (code, name, description)
  values ('neopatentati_potenza_b', 'Limiti di potenza per neopatentati (patente B)',
          'Art. 117, comma 2-bis, D.Lgs. 285/1992 (Codice della strada)')
  returning id
)
insert into public.legal_rule_versions
  (rule_id, version_label, status, license_obtained_from, license_obtained_to, effective_from, params, exceptions, sources,
   consulted_on, reason, published_at, tested_at, test_results)
select r.id, x.label, 'pubblicata', x.lic_from, x.lic_to, x.eff_from, x.params, x.exceptions, x.sources,
       date '2026-11-19', x.reason, now(), now(), '{"note":"versione iniziale caricata con la migrazione"}'::jsonb
from r, (values
  ('2011 — patenti conseguite fino al 13/12/2024', null::date, date '2024-12-13', date '2011-02-09',
   '{"license_categories":["B"],"duration_months":12,"max_power_to_tare_kw_t":55,"max_power_kw":70,
     "max_power_kw_categories":["M1"],"borderline_margin_pct":2,"documented_ratio_required_for_fuels":["elettrica","ibrida_plugin"]}'::jsonb,
   '[{"code":"accompagnatore","title":"Accompagnatore esperto","description":"A fianco una persona di età non superiore a 65 anni con patente valida per la stessa categoria da almeno 10 anni, o per categoria superiore."},
     {"code":"disabilita","title":"Veicolo al servizio di persona con disabilità","description":"Persona invalida a bordo, munita del contrassegno previsto dall''art. 188."}]'::jsonb,
   '[{"title":"Polizia di Stato — limitazioni neopatentati (regime precedente)","url":"https://poliziadistato.it/articolo/pdf/11365"}]'::jsonb,
   'Regime previgente: primo anno dal rilascio, 55 kW/t e 70 kW per veicoli M1.'),
  ('2024 — L. 177/2024, patenti dal 14/12/2024', date '2024-12-14', null::date, date '2024-12-14',
   '{"license_categories":["B"],"duration_months":36,"max_power_to_tare_kw_t":75,"max_power_kw":105,
     "max_power_kw_categories":["M1"],"borderline_margin_pct":2,"documented_ratio_required_for_fuels":["elettrica","ibrida_plugin"]}'::jsonb,
   '[{"code":"accompagnatore","title":"Accompagnatore esperto","description":"A fianco una persona di età non superiore a 65 anni con patente valida per la stessa categoria da almeno 10 anni, o per categoria superiore."},
     {"code":"disabilita","title":"Veicolo al servizio di persona con disabilità","description":"Persona invalida a bordo, munita del contrassegno previsto dall''art. 188; vale anche se il conducente è la persona con disabilità."},
     {"code":"patente_superiore","title":"Patente di categoria superiore","description":"Conseguimento, entro i tre anni, di patente BE, C1, C, C1E, CE, D1, D1E, D o DE."}]'::jsonb,
   '[{"title":"Legge 25 novembre 2024, n. 177 (Normattiva)","url":"https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-11-25;177"},
     {"title":"D.Lgs. 30 aprile 1992, n. 285 — Codice della strada (Normattiva)","url":"https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285"},
     {"title":"ACI — Rivista giuridica: Limitazioni per i neopatentati (versione aggiornata)","url":"https://rivistagiuridica.aci.it/fileadmin/Documenti/2026/Dottrina_e_Approfondimenti/Limitazioni_per_i_neopatentati_versione_aggiornata.pdf"}]'::jsonb,
   'Art. 7 L. 177/2024 (in vigore dal 14/12/2024): primi tre anni, 75 kW/t; per veicoli M1 ulteriore limite di 105 kW.')
) as x(label, lic_from, lic_to, eff_from, params, exceptions, sources, reason);

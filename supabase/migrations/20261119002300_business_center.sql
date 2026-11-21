-- =====================================================================
-- Migrazione 0023 — Fase 30: AutoGarage24 Business Center
--
--  * L'azienda è il profilo professionale (professional_profiles): nessuna tabella duplicata.
--  * Collaboratori con ruoli e permessi granulari, inviti, revoca, audit.
--  * Lead calcolati dalle richieste reali già presenti (richieste, prenotazioni, soccorso,
--    trasporti, revisioni, valutazioni, permute, offerte): si aggiungono solo stato CRM,
--    note interne (mai visibili ai clienti) e attività.
--  * Statistiche calcolate lato server dai dati registrati; visualizzazioni giornaliere
--    registrate da ora in avanti (nessun dato storico ricostruito o stimato).
--  * Piani predisposti ma non a pagamento: limiti verificati lato server.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Visualizzazioni giornaliere (per i confronti temporali)
-- ---------------------------------------------------------------------
create table public.daily_view_counts (
  target_kind  text not null check (target_kind in ('profilo', 'annuncio', 'ricambio', 'offerta')),
  target_id    uuid not null,
  day          date not null default (now() at time zone 'Europe/Rome')::date,
  views        integer not null default 0 check (views >= 0),
  primary key (target_kind, target_id, day)
);
create index daily_view_counts_day_idx on public.daily_view_counts (day);
alter table public.daily_view_counts enable row level security;
revoke all on public.daily_view_counts from anon, authenticated;
grant all on public.daily_view_counts to service_role;

create or replace function private.bump_view(_kind text, _id uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.daily_view_counts (target_kind, target_id, day, views) values (_kind, _id, (now() at time zone 'Europe/Rome')::date, 1)
  on conflict (target_kind, target_id, day) do update set views = public.daily_view_counts.views + 1;
$$;

create or replace function public.track_profile_view(profile_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _id uuid;
begin
  update public.professional_profiles set view_count = view_count + 1
   where slug = profile_slug and is_published and review_status = 'approvato' returning id into _id;
  if _id is not null then perform private.bump_view('profilo', _id); end if;
end;
$$;
grant execute on function public.track_profile_view(text) to anon, authenticated;

create or replace function public.track_listing_view(listing_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _id uuid;
begin
  update public.vehicle_listings set view_count = view_count + 1 where slug = listing_slug and status = 'pubblicato' returning id into _id;
  if _id is not null then perform private.bump_view('annuncio', _id); end if;
end;
$$;
grant execute on function public.track_listing_view(text) to anon, authenticated;

create or replace function public.track_part_view(part_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _id uuid;
begin
  update public.part_listings set view_count = view_count + 1 where slug = part_slug and status = 'pubblicato' returning id into _id;
  if _id is not null then perform private.bump_view('ricambio', _id); end if;
end;
$$;
grant execute on function public.track_part_view(text) to anon, authenticated;

create or replace function public.track_offer(offer_slug text, is_click boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
declare _id uuid;
begin
  perform set_config('ag24.trusted', 'on', true);
  update public.promotional_offers set view_count = view_count + case when is_click then 0 else 1 end,
         click_count = click_count + case when is_click then 1 else 0 end
   where slug = offer_slug and status = 'pubblicata' returning id into _id;
  perform set_config('ag24.trusted', 'off', true);
  if _id is not null and not is_click then perform private.bump_view('offerta', _id); end if;
end;
$$;
grant execute on function public.track_offer(text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Piani (predisposti, nessun pagamento) e limiti verificati lato server
-- ---------------------------------------------------------------------
alter table public.subscription_plans drop constraint if exists subscription_plans_audience_check;
alter table public.subscription_plans add constraint subscription_plans_audience_check
  check (audience in ('officina', 'meccanico', 'venditore_auto', 'venditore_ricambi', 'soccorritore', 'trasportatore', 'centro_revisione', 'intermediario_assicurativo', 'tutti'));

create table public.plan_limits (
  plan_code          text primary key references public.subscription_plans (code) on update cascade on delete cascade,
  max_vehicle_listings integer check (max_vehicle_listings >= 0),
  max_part_listings  integer check (max_part_listings >= 0),
  max_members        integer not null default 0 check (max_members >= 0),
  max_active_offers  integer check (max_active_offers >= 0),
  analytics_days     integer not null default 90 check (analytics_days between 7 and 3650),
  exports_enabled    boolean not null default true,
  promo_visibility   boolean not null default false,
  advanced_features  boolean not null default false,
  updated_at         timestamptz not null default now()
);

insert into public.subscription_plans (code, name, audience, features, price_note, active) values
  ('free', 'Free', 'tutti', '["Profilo aziendale", "Richieste e messaggi", "Business Center", "Statistiche 90 giorni", "Esportazioni"]', 'Gratuito durante il lancio a Milano', true),
  ('starter', 'Starter', 'tutti', '["Tutto Free", "Più collaboratori", "Statistiche 365 giorni"]', 'Non attivo: prezzo da definire e approvare dal fondatore', false),
  ('professional', 'Professional', 'tutti', '["Tutto Starter", "Visibilità promozionale", "Funzioni avanzate"]', 'Non attivo: prezzo da definire e approvare dal fondatore', false),
  ('business', 'Business', 'tutti', '["Tutto Professional", "Collaboratori illimitati", "Storico completo"]', 'Non attivo: prezzo da definire e approvare dal fondatore', false)
on conflict (code) do nothing;
insert into public.plan_limits (plan_code, max_vehicle_listings, max_part_listings, max_members, max_active_offers, analytics_days, exports_enabled, promo_visibility, advanced_features) values
  ('free', null, null, 3, 10, 90, true, false, false),
  ('starter', null, null, 5, 25, 365, true, false, false),
  ('professional', null, null, 15, 100, 730, true, true, true),
  ('business', null, null, 50, null, 3650, true, true, true)
on conflict (plan_code) do nothing;

-- Piano assegnato all'azienda: senza riga vale «free». Nessun pagamento collegato.
create table public.business_plan_assignments (
  profile_id  uuid primary key references public.professional_profiles (id) on delete cascade,
  plan_code   text not null references public.subscription_plans (code) on update cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  note        text check (char_length(note) <= 500),
  updated_at  timestamptz not null default now()
);

create or replace function private.business_limits(_profile uuid)
returns public.plan_limits language sql stable security definer set search_path = ''
as $$
  select l.* from public.plan_limits l
  where l.plan_code = coalesce((select a.plan_code from public.business_plan_assignments a join public.subscription_plans p on p.code = a.plan_code
                                where a.profile_id = _profile and p.active), 'free');
$$;

-- ---------------------------------------------------------------------
-- Collaboratori
-- ---------------------------------------------------------------------
create table public.business_members (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.professional_profiles (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  invite_email  text not null check (invite_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role          text not null check (role in ('amministratore', 'responsabile', 'dipendente', 'operatore')),
  permissions   text[] not null default '{}' check (permissions <@ array['lead', 'prenotazioni', 'annunci', 'offerte', 'statistiche', 'esportazioni', 'team', 'profilo', 'attivita']::text[]),
  status        text not null default 'invitato' check (status in ('invitato', 'attivo', 'revocato')),
  invited_by    uuid references public.profiles (id) on delete set null,
  accepted_at   timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index business_members_email_uniq on public.business_members (profile_id, lower(invite_email)) where status <> 'revocato';
create unique index business_members_user_uniq on public.business_members (profile_id, user_id) where status = 'attivo';
create trigger business_members_updated before update on public.business_members for each row execute function private.set_updated_at();

create table public.business_audit (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.professional_profiles (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index business_audit_profile_idx on public.business_audit (profile_id, created_at desc);
create trigger business_audit_immutable before update or delete on public.business_audit for each row execute function private.history_immutable();

create or replace function private.business_log(_profile uuid, _action text, _details jsonb)
returns void language sql security definer set search_path = ''
as $$ insert into public.business_audit (profile_id, actor_id, action, details) values (_profile, auth.uid(), _action, coalesce(_details, '{}'::jsonb)); $$;

-- Ruoli predefiniti → permessi (il titolare ha sempre tutti i permessi).
create or replace function private.business_role_permissions(_role text)
returns text[] language sql immutable set search_path = ''
as $$
  select case _role
    when 'amministratore' then array['lead', 'prenotazioni', 'annunci', 'offerte', 'statistiche', 'esportazioni', 'team', 'profilo', 'attivita']
    when 'responsabile' then array['lead', 'prenotazioni', 'annunci', 'offerte', 'statistiche', 'esportazioni', 'attivita']
    when 'dipendente' then array['lead', 'prenotazioni', 'attivita']
    else array['prenotazioni', 'attivita'] end;
$$;

create or replace function private.business_can(_profile uuid, _perm text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.owns_profile(_profile)
      or exists (select 1 from public.business_members m where m.profile_id = _profile and m.user_id = (select auth.uid()) and m.status = 'attivo'
                 and (_perm = any (m.permissions) or (_perm = 'accesso')));
$$;

create or replace function public.my_businesses()
returns table (profile_id uuid, display_name text, slug text, professional_type text, role text, permissions text[])
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.display_name, pp.slug, pp.professional_type::text, 'proprietario', private.business_role_permissions('amministratore')
  from public.professional_profiles pp where pp.user_id = auth.uid() and pp.deleted_at is null
  union all
  select pp.id, pp.display_name, pp.slug, pp.professional_type::text, m.role, m.permissions
  from public.business_members m join public.professional_profiles pp on pp.id = m.profile_id
  where m.user_id = auth.uid() and m.status = 'attivo' and pp.deleted_at is null;
$$;
grant execute on function public.my_businesses() to authenticated;

create or replace function public.invite_business_member(profile_id uuid, email text, role text, permissions text[] default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _lim public.plan_limits; _n integer; _u uuid; _name text;
begin
  if not private.business_can(invite_business_member.profile_id, 'team') then raise exception 'Non hai il permesso di gestire il team' using errcode = '42501'; end if;
  if role not in ('amministratore', 'responsabile', 'dipendente', 'operatore') then raise exception 'Ruolo non valido' using errcode = '22023'; end if;
  if role = 'amministratore' and not private.owns_profile(invite_business_member.profile_id) then raise exception 'Solo il titolare nomina amministratori' using errcode = '42501'; end if;
  _lim := private.business_limits(invite_business_member.profile_id);
  select count(*) into _n from public.business_members m where m.profile_id = invite_business_member.profile_id and m.status <> 'revocato';
  if _n >= _lim.max_members then raise exception 'Il piano attuale consente al massimo % collaboratori', _lim.max_members using errcode = '23514'; end if;
  if lower(trim(invite_business_member.email)) = (select lower(u.email) from auth.users u where u.id = (select pp.user_id from public.professional_profiles pp where pp.id = invite_business_member.profile_id)) then
    raise exception 'Il titolare non può invitare se stesso' using errcode = '22023';
  end if;
  perform private.enforce_rate_limit('business_invite', 20, interval '1 day');
  insert into public.business_members (profile_id, invite_email, role, permissions, invited_by)
  values (invite_business_member.profile_id, lower(trim(invite_business_member.email)), role,
          coalesce(nullif(permissions, '{}'), private.business_role_permissions(role)), auth.uid())
  returning id into _id;
  select display_name into _name from public.professional_profiles where id = invite_business_member.profile_id;
  select u.id into _u from auth.users u where lower(u.email) = lower(trim(invite_business_member.email));
  if _u is not null then
    perform private.notify(_u, 'account', 'Invito nel team di ' || _name, 'Accetta l''invito dal Business Center', '/business/team', 'biz-invite:' || _id);
  end if;
  perform private.business_log(invite_business_member.profile_id, 'membro.invitato', jsonb_build_object('email', lower(trim(invite_business_member.email)), 'ruolo', role));
  return _id;
end;
$$;

create or replace function public.accept_business_invite(member_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _m public.business_members%rowtype; _email text;
begin
  select lower(email) into _email from auth.users where id = auth.uid();
  select * into _m from public.business_members where id = member_id and status = 'invitato' for update;
  if not found or _m.invite_email <> _email then raise exception 'Invito non trovato' using errcode = 'P0002'; end if;
  update public.business_members set status = 'attivo', user_id = auth.uid(), accepted_at = now() where id = _m.id;
  perform private.business_log(_m.profile_id, 'membro.accettato', jsonb_build_object('member_id', _m.id));
  perform private.notify((select user_id from public.professional_profiles where id = _m.profile_id), 'account', 'Invito accettato', _m.invite_email, '/business/team', 'biz-acc:' || _m.id);
end;
$$;

create or replace function public.update_business_member(member_id uuid, role text default null, permissions text[] default null, revoke boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
declare _m public.business_members%rowtype;
begin
  select * into _m from public.business_members where id = member_id for update;
  if not found then raise exception 'Collaboratore non trovato' using errcode = 'P0002'; end if;
  if _m.user_id = auth.uid() and not coalesce(revoke, false) then raise exception 'Non puoi modificare i tuoi permessi' using errcode = '42501'; end if;
  if not private.business_can(_m.profile_id, 'team') then raise exception 'Non hai il permesso di gestire il team' using errcode = '42501'; end if;
  if (_m.role = 'amministratore' or update_business_member.role = 'amministratore') and not private.owns_profile(_m.profile_id) and _m.user_id <> auth.uid() then
    raise exception 'Solo il titolare gestisce gli amministratori' using errcode = '42501';
  end if;
  if coalesce(revoke, false) then
    update public.business_members set status = 'revocato', revoked_at = now() where id = _m.id;
    perform private.business_log(_m.profile_id, 'membro.revocato', jsonb_build_object('member_id', _m.id, 'email', _m.invite_email));
    if _m.user_id is not null then perform private.notify(_m.user_id, 'account', 'Accesso al team revocato', (select display_name from public.professional_profiles where id = _m.profile_id), '/business', 'biz-rev:' || _m.id); end if;
  else
    if update_business_member.role is not null and update_business_member.role not in ('amministratore', 'responsabile', 'dipendente', 'operatore') then raise exception 'Ruolo non valido' using errcode = '22023'; end if;
    update public.business_members set role = coalesce(update_business_member.role, _m.role),
      permissions = coalesce(update_business_member.permissions, case when update_business_member.role is not null then private.business_role_permissions(update_business_member.role) else _m.permissions end)
     where id = _m.id;
    perform private.business_log(_m.profile_id, 'membro.permessi', jsonb_build_object('member_id', _m.id, 'ruolo', coalesce(update_business_member.role, _m.role), 'permessi', update_business_member.permissions));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Lead: stato CRM e note interne sulle richieste reali
-- ---------------------------------------------------------------------
create table public.business_lead_states (
  profile_id   uuid not null references public.professional_profiles (id) on delete cascade,
  source       text not null check (source in ('richiesta', 'prenotazione', 'soccorso', 'trasporto', 'revisione', 'valutazione', 'permuta', 'offerta')),
  source_id    uuid not null,
  status       text not null default 'nuovo' check (status in ('nuovo', 'da_contattare', 'in_trattativa', 'preventivo_inviato', 'appuntamento_fissato', 'completato', 'non_convertito')),
  assigned_to  uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (profile_id, source, source_id)
);

create table public.business_lead_notes (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.professional_profiles (id) on delete cascade,
  source      text not null,
  source_id   uuid not null,
  author_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index business_lead_notes_idx on public.business_lead_notes (profile_id, source, source_id, created_at);

-- Tutte le richieste ricevute dall'azienda, da fonti reali. Nome del cliente: solo il nome visualizzato.
create or replace function public.business_leads(profile_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (source text, source_id uuid, received_at timestamptz, kind text, title text, vehicle text, customer_name text, customer_city text,
               source_status text, conversation_id uuid, lead_status text, assigned_to uuid, notes_count integer)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare _p uuid := business_leads.profile_id; _owner uuid; _from timestamptz; _to timestamptz := coalesce(p_to, now() + interval '1 day');
        _days integer;
begin
  if not private.business_can(_p, 'lead') then raise exception 'Non hai il permesso di vedere i contatti' using errcode = '42501'; end if;
  select user_id into _owner from public.professional_profiles where id = _p;
  _days := (private.business_limits(_p)).analytics_days;
  _from := greatest(coalesce(p_from, now() - interval '90 days'), now() - make_interval(days => _days));
  return query
  with base as (
    select 'richiesta'::text src, r.id sid, r.created_at at_, r.kind::text k, r.subject t, nullif(concat_ws(' ', r.vehicle_make, r.vehicle_model, r.vehicle_year::text), '') veh,
           r.requester_id cust, r.status::text st, c.id conv
      from public.requests r left join public.conversations c on c.request_id = r.id
     where (r.professional_profile_id = _p or (r.recipient_id = _owner and r.listing_id in (select l.id from public.vehicle_listings l where l.professional_profile_id = _p)))
       and r.kind::text <> 'appuntamento_auto'
    union all
    select 'prenotazione', b.id, b.created_at, b.kind, 'Prenotazione: ' || l.title, l.title, b.buyer_id, b.status, (select c.id from public.conversations c where c.request_id = b.request_id)
      from public.vehicle_bookings b join public.vehicle_listings l on l.id = b.listing_id where b.seller_id = _owner
    union all
    select 'soccorso', rr.id, t.created_at, rr.service, 'Soccorso: ' || rr.area_text, rr.vehicle_desc, rr.user_id, rr.status, t.conversation_id
      from public.roadside_targets t join public.roadside_requests rr on rr.id = t.request_id where t.profile_id = _p
    union all
    select 'trasporto', tr.id, min(q.created_at), tr.service, 'Trasporto ' || tr.pickup_city || ' → ' || tr.delivery_city, tr.vehicle_desc, tr.user_id, tr.status, min(q.conversation_id::text)::uuid
      from public.transport_quotes q join public.transport_requests tr on tr.id = q.request_id where q.profile_id = _p group by tr.id
    union all
    select 'revisione', a.id, a.created_at, a.vehicle_category, 'Revisione', a.vehicle_desc, a.user_id, a.status, a.conversation_id
      from public.inspection_appointments a where a.center_profile_id = _p
    union all
    select 'valutazione', vt.request_id, vt.created_at, vr.intent, 'Valutazione auto', concat_ws(' ', vv.make, vv.model, vv.year::text), vr.user_id, vt.status, vt.conversation_id
      from public.valuation_request_targets vt join public.valuation_requests vr on vr.id = vt.request_id join public.vehicle_valuations vv on vv.id = vr.valuation_id where vt.profile_id = _p
    union all
    select 'permuta', tp.id, tp.created_at, 'permuta', 'Permuta: ' || l.title, l.title, tp.buyer_id, tp.status, tp.conversation_id
      from public.trade_in_proposals tp join public.vehicle_listings l on l.id = tp.listing_id where tp.seller_id = _owner and l.professional_profile_id = _p
    union all
    select 'offerta', oc.id, oc.created_at, o.category, 'Offerta: ' || o.title, null, oc.user_id, oc.status, oc.conversation_id
      from public.offer_claims oc join public.promotional_offers o on o.id = oc.offer_id where o.profile_id = _p
  )
  select b.src, b.sid, b.at_, b.k, b.t, b.veh,
         coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'Cliente'), pr.city, b.st,
         case when _owner = auth.uid() then b.conv end,
         coalesce(ls.status, 'nuovo'), ls.assigned_to,
         (select count(*)::integer from public.business_lead_notes n where n.profile_id = _p and n.source = b.src and n.source_id = b.sid)
  from base b
  left join public.profiles pr on pr.id = b.cust
  left join public.business_lead_states ls on ls.profile_id = _p and ls.source = b.src and ls.source_id = b.sid
  where b.at_ >= _from and b.at_ < _to
  order by b.at_ desc
  limit 2000;
end;
$$;

create or replace function public.set_lead_status(profile_id uuid, source text, source_id uuid, status text, assigned_to uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.business_can(set_lead_status.profile_id, 'lead') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if not exists (select 1 from public.business_leads(set_lead_status.profile_id, now() - interval '3650 days') l where l.source = set_lead_status.source and l.source_id = set_lead_status.source_id) then
    raise exception 'Contatto non trovato' using errcode = 'P0002';
  end if;
  if assigned_to is not null and assigned_to <> (select user_id from public.professional_profiles where id = set_lead_status.profile_id)
     and not exists (select 1 from public.business_members m where m.profile_id = set_lead_status.profile_id and m.user_id = set_lead_status.assigned_to and m.status = 'attivo') then
    raise exception 'Puoi assegnare solo a collaboratori del team' using errcode = '22023';
  end if;
  insert into public.business_lead_states (profile_id, source, source_id, status, assigned_to, updated_by)
  values (set_lead_status.profile_id, set_lead_status.source, set_lead_status.source_id, set_lead_status.status, set_lead_status.assigned_to, auth.uid())
  on conflict on constraint business_lead_states_pkey do update set status = excluded.status, assigned_to = excluded.assigned_to, updated_by = auth.uid(), updated_at = now();
  if assigned_to is not null and assigned_to <> auth.uid() then
    perform private.notify(assigned_to, 'richieste', 'Ti è stato assegnato un contatto', replace(set_lead_status.status, '_', ' '), '/business/lead', 'biz-lead:' || set_lead_status.source_id || ':' || assigned_to);
  end if;
end;
$$;

create or replace function public.add_lead_note(profile_id uuid, source text, source_id uuid, body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid;
begin
  if not private.business_can(add_lead_note.profile_id, 'lead') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if not exists (select 1 from public.business_leads(add_lead_note.profile_id, now() - interval '3650 days') l where l.source = add_lead_note.source and l.source_id = add_lead_note.source_id) then
    raise exception 'Contatto non trovato' using errcode = 'P0002';
  end if;
  insert into public.business_lead_notes (profile_id, source, source_id, body) values (add_lead_note.profile_id, add_lead_note.source, add_lead_note.source_id, trim(body)) returning id into _id;
  return _id;
end;
$$;

-- ---------------------------------------------------------------------
-- Attività
-- ---------------------------------------------------------------------
create table public.business_tasks (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.professional_profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 160),
  description  text check (char_length(description) <= 2000),
  kind         text not null default 'altro' check (kind in ('rispondere', 'richiamare', 'preventivo', 'confermare_appuntamento', 'aggiornare_annuncio', 'rispondere_recensione', 'altro')),
  priority     text not null default 'media' check (priority in ('bassa', 'media', 'alta')),
  due_at       timestamptz,
  assigned_to  uuid references public.profiles (id) on delete set null,
  lead_source  text,
  lead_id      uuid,
  status       text not null default 'aperta' check (status in ('aperta', 'completata', 'annullata')),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  completed_at timestamptz,
  notified_due boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index business_tasks_profile_idx on public.business_tasks (profile_id, status, due_at);
create trigger business_tasks_updated before update on public.business_tasks for each row execute function private.set_updated_at();

create or replace function private.business_tasks_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('ag24.trusted', true) = 'on' then return new; end if;
  if not private.business_can(new.profile_id, 'attivita') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if new.assigned_to is not null and new.assigned_to <> (select user_id from public.professional_profiles where id = new.profile_id)
     and not exists (select 1 from public.business_members m where m.profile_id = new.profile_id and m.user_id = new.assigned_to and m.status = 'attivo') then
    raise exception 'Puoi assegnare solo a collaboratori del team' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.notified_due := false; new.completed_at := null; new.status := 'aperta';
  else
    new.profile_id := old.profile_id; new.created_by := old.created_by;
    new.completed_at := case when new.status = 'completata' and old.status <> 'completata' then now() when new.status <> 'completata' then null else old.completed_at end;
    if new.due_at is distinct from old.due_at then new.notified_due := false; end if;
  end if;
  if new.assigned_to is not null and new.assigned_to <> auth.uid() and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform private.notify(new.assigned_to, 'richieste', 'Nuova attività assegnata', new.title, '/business/attivita', 'biz-task:' || new.id || ':' || new.assigned_to);
  end if;
  return new;
end;
$$;
create trigger business_tasks_guard before insert or update on public.business_tasks for each row execute function private.business_tasks_guard();

create or replace function private.process_business_tasks()
returns void language plpgsql security definer set search_path = ''
as $$
declare _t record;
begin
  for _t in select t.*, pp.user_id owner from public.business_tasks t join public.professional_profiles pp on pp.id = t.profile_id
            where t.status = 'aperta' and not t.notified_due and t.due_at is not null and t.due_at <= now() + interval '2 hours' loop
    perform private.notify(coalesce(_t.assigned_to, _t.owner), 'richieste', 'Attività in scadenza: ' || _t.title,
      to_char(_t.due_at at time zone 'Europe/Rome', 'DD/MM HH24:MI'), '/business/attivita', 'biz-due:' || _t.id);
    perform set_config('ag24.trusted', 'on', true);
    update public.business_tasks set notified_due = true where id = _t.id;
    perform set_config('ag24.trusted', 'off', true);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Statistiche (solo dati registrati)
-- ---------------------------------------------------------------------
create or replace function public.business_stats(profile_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare _p uuid := business_stats.profile_id; _owner uuid; _from timestamptz; _to timestamptz := least(p_to, now() + interval '1 day'); _days integer;
        _leads jsonb; _res jsonb; _contacts integer; _appts integer; _done integer; _bk_total integer; _bk_conf integer; _rev record;
begin
  if not private.business_can(_p, 'statistiche') then raise exception 'Non hai il permesso di vedere le statistiche' using errcode = '42501'; end if;
  select user_id into _owner from public.professional_profiles where id = _p;
  _days := (private.business_limits(_p)).analytics_days;
  _from := greatest(p_from, now() - make_interval(days => _days));
  select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) into _leads from (
    select source, kind, received_at, source_status, lead_status, customer_city from public.business_leads(_p, _from, _to)) l;
  _contacts := jsonb_array_length(_leads);
  _appts := (select count(*) from jsonb_array_elements(_leads) e where e ->> 'lead_status' = 'appuntamento_fissato'
             or (e ->> 'source' in ('prenotazione', 'revisione') and e ->> 'source_status' in ('confermato', 'completato'))
             or (e ->> 'source' = 'richiesta' and e ->> 'source_status' in ('appuntamento_proposto', 'accettata', 'completata')));
  _done := (select count(*) from jsonb_array_elements(_leads) e where e ->> 'lead_status' = 'completato' or e ->> 'source_status' in ('completata', 'completato', 'accettata'));
  select count(*) filter (where true), count(*) filter (where status in ('confermato', 'completato')) into _bk_total, _bk_conf
    from public.vehicle_bookings b where b.seller_id = _owner and b.created_at between _from and _to;
  select count(*) n, round(avg(rating)::numeric, 2) avg into _rev from public.reviews r where r.profile_id = _p and r.status = 'pubblicata' and r.created_at between _from and _to;
  _res := jsonb_build_object(
    'from', _from, 'to', _to, 'max_days', _days,
    'profile_views', (select coalesce(sum(views), 0) from public.daily_view_counts where target_kind = 'profilo' and target_id = _p and day between _from::date and _to::date),
    'listing_views', (select coalesce(sum(d.views), 0) from public.daily_view_counts d join public.vehicle_listings l on l.id = d.target_id
                      where d.target_kind = 'annuncio' and l.professional_profile_id = _p and d.day between _from::date and _to::date)
                   + (select coalesce(sum(d.views), 0) from public.daily_view_counts d join public.part_listings l on l.id = d.target_id
                      where d.target_kind = 'ricambio' and l.professional_profile_id = _p and d.day between _from::date and _to::date),
    'views_tracked_since', (select min(day) from public.daily_view_counts),
    'contacts', _contacts,
    'quote_requests', (select count(*) from jsonb_array_elements(_leads) e where e ->> 'kind' in ('preventivo') or e ->> 'source' in ('soccorso', 'trasporto', 'valutazione')),
    'bookings', _bk_total, 'bookings_confirmed', _bk_conf,
    'appointments', _appts,
    'pending', (select count(*) from jsonb_array_elements(_leads) e where e ->> 'lead_status' = 'nuovo' and e ->> 'source_status' in ('nuova', 'inviata', 'in_attesa', 'richiesta', 'richiesto')),
    'reviews', _rev.n, 'reviews_avg', _rev.avg,
    'completed', _done,
    -- Tassi solo con almeno 5 casi: sotto quella soglia non si mostra una percentuale.
    'conv_contact_appt', case when _contacts >= 5 then round(_appts::numeric / _contacts, 3) end,
    'conv_appt_done', case when _appts >= 5 then round(_done::numeric / _appts, 3) end,
    'by_source', (select coalesce(jsonb_object_agg(s, n), '{}'::jsonb) from (select e ->> 'source' s, count(*) n from jsonb_array_elements(_leads) e group by 1) x),
    'by_kind', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select e ->> 'kind' k, count(*) n from jsonb_array_elements(_leads) e where e ->> 'kind' is not null group by 1 order by 2 desc limit 10) x),
    -- Provenienza geografica aggregata: solo città con almeno 3 contatti (protezione della privacy).
    'by_city', (select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) from (select e ->> 'customer_city' c, count(*) n from jsonb_array_elements(_leads) e
                where coalesce(e ->> 'customer_city', '') <> '' group by 1 having count(*) >= 3 order by 2 desc limit 10) x),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'contacts', coalesce(c.n, 0), 'views', coalesce(v.n, 0)) order by d), '[]'::jsonb)
              from generate_series(_from::date, least(_to::date, (now() at time zone 'Europe/Rome')::date), interval '1 day') d
              left join (select (e ->> 'received_at')::timestamptz::date dd, count(*) n from jsonb_array_elements(_leads) e group by 1) c on c.dd = d::date
              left join (select day, sum(views) n from public.daily_view_counts where target_kind = 'profilo' and target_id = _p group by day) v on v.day = d::date),
    'top_listings', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select l.id, l.title, l.slug, l.status, l.view_count total_views,
                       (select coalesce(sum(views), 0) from public.daily_view_counts d where d.target_kind = 'annuncio' and d.target_id = l.id and d.day between _from::date and _to::date) period_views,
                       (select count(*) from public.requests r where r.listing_id = l.id and r.created_at between _from and _to) contacts
                     from public.vehicle_listings l where l.professional_profile_id = _p order by 6 desc, 5 desc limit 10) x),
    'reviews_monthly', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'count', n, 'avg', a) order by m), '[]'::jsonb)
                        from (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n, round(avg(rating)::numeric, 2) a from public.reviews
                              where profile_id = _p and status = 'pubblicata' and created_at >= now() - interval '12 months' group by 1) x));
  return _res;
end;
$$;

-- ---------------------------------------------------------------------
-- Completezza del profilo (suggerimenti basati su dati reali)
-- ---------------------------------------------------------------------
create or replace function public.business_profile_completeness(profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare _pp public.professional_profiles%rowtype; _items jsonb := '[]'::jsonb; _score integer := 0; _photos integer; _services integer; _pending integer; _stale integer; _noreply integer;
begin
  if not private.business_can(business_profile_completeness.profile_id, 'accesso') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  select * into _pp from public.professional_profiles where id = business_profile_completeness.profile_id;
  select count(*) into _photos from public.business_photos where business_photos.profile_id = _pp.id;
  select count(*) into _services from public.professional_services where professional_services.profile_id = _pp.id;
  select count(*) into _pending from public.business_leads(_pp.id, now() - interval '60 days') l where l.lead_status = 'nuovo' and l.source_status in ('nuova', 'inviata', 'in_attesa', 'richiesta') and l.received_at < now() - interval '48 hours';
  select count(*) into _stale from public.vehicle_listings l where l.professional_profile_id = _pp.id and l.status = 'pubblicato' and l.updated_at < now() - interval '60 days';
  select count(*) into _noreply from public.reviews r where r.profile_id = _pp.id and r.status = 'pubblicata' and r.reply is null;
  _items := jsonb_build_array(
    jsonb_build_object('key', 'descrizione', 'ok', char_length(coalesce(_pp.description, '')) >= 200, 'weight', 15, 'tip', 'Scrivi una descrizione di almeno 200 caratteri: servizi, specializzazioni, marchi trattati.', 'href', '/dashboard/profilo-professionale'),
    jsonb_build_object('key', 'logo', 'ok', _pp.logo_path is not null, 'weight', 10, 'tip', 'Carica il logo dell''attività.', 'href', '/dashboard/profilo-professionale'),
    jsonb_build_object('key', 'foto', 'ok', _photos >= 3 or _pp.cover_path is not null and _photos >= 2, 'weight', 15, 'tip', 'Aggiungi almeno 3 foto reali di sede, officina o veicoli.', 'href', '/dashboard/profilo-professionale'),
    jsonb_build_object('key', 'orari', 'ok', _pp.opening_hours is not null and _pp.opening_hours <> '{}'::jsonb, 'weight', 10, 'tip', 'Inserisci gli orari di apertura.', 'href', '/dashboard/profilo-professionale'),
    jsonb_build_object('key', 'servizi', 'ok', _services >= 3, 'weight', 15, 'tip', 'Elenca almeno 3 servizi con descrizione.', 'href', '/dashboard/servizi'),
    jsonb_build_object('key', 'contatti', 'ok', _pp.phone_public is not null and _pp.address_line is not null and _pp.latitude is not null, 'weight', 10, 'tip', 'Completa telefono e indirizzo (serve anche per la mappa e la distanza).', 'href', '/dashboard/profilo-professionale'),
    jsonb_build_object('key', 'risposte', 'ok', _pending = 0, 'weight', 10, 'tip', _pending || ' richieste senza risposta da oltre 48 ore.', 'href', '/business/lead'),
    jsonb_build_object('key', 'annunci', 'ok', _stale = 0, 'weight', 5, 'tip', _stale || ' annunci pubblicati non aggiornati da oltre 60 giorni.', 'href', '/dashboard/annunci'),
    jsonb_build_object('key', 'recensioni', 'ok', _noreply = 0, 'weight', 10, 'tip', _noreply || ' recensioni senza risposta.', 'href', '/dashboard/recensioni'));
  select coalesce(sum((e ->> 'weight')::integer), 0) into _score from jsonb_array_elements(_items) e where (e ->> 'ok')::boolean;
  return jsonb_build_object('score', _score, 'items', _items);
end;
$$;

-- ---------------------------------------------------------------------
-- Gestione prenotazioni da parte dei collaboratori autorizzati
-- L'azione viene eseguita a nome del titolare (le funzioni esistenti restano l'unica
-- logica di disponibilità e stato) e registrata nel registro aziendale.
-- ---------------------------------------------------------------------
create or replace function private.as_owner(_owner uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare _prev text := current_setting('request.jwt.claims', true);
begin
  perform set_config('request.jwt.claims', jsonb_set(coalesce(nullif(_prev, '')::jsonb, '{}'::jsonb), '{sub}', to_jsonb(_owner::text))::text, true);
  perform set_config('ag24.prev_claim_sub', coalesce(current_setting('request.jwt.claim.sub', true), ''), true);
  if coalesce(current_setting('request.jwt.claim.sub', true), '') <> '' then perform set_config('request.jwt.claim.sub', _owner::text, true); end if;
  return _prev;
end;
$$;

create or replace function private.restore_claims(_prev text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', coalesce(_prev, ''), true);
  if coalesce(current_setting('ag24.prev_claim_sub', true), '') <> '' then
    perform set_config('request.jwt.claim.sub', current_setting('ag24.prev_claim_sub', true), true);
  end if;
end;
$$;

create or replace function public.business_respond_booking(profile_id uuid, booking_id uuid, action text, new_starts_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _owner uuid; _prev text; _me uuid := auth.uid();
begin
  if not private.business_can(business_respond_booking.profile_id, 'prenotazioni') then raise exception 'Non hai il permesso di gestire le prenotazioni' using errcode = '42501'; end if;
  select user_id into _owner from public.professional_profiles where id = business_respond_booking.profile_id;
  if not exists (select 1 from public.vehicle_bookings b where b.id = booking_id and b.seller_id = _owner) then raise exception 'Prenotazione non trovata' using errcode = 'P0002'; end if;
  if action not in ('conferma', 'rifiuta', 'proponi', 'completa', 'mancata_presentazione', 'annulla') then raise exception 'Azione non valida' using errcode = '22023'; end if;
  perform private.business_log(business_respond_booking.profile_id, 'prenotazione.' || action, jsonb_build_object('booking_id', booking_id, 'collaboratore', _me));
  if _owner <> _me then _prev := private.as_owner(_owner); end if;
  perform public.respond_booking(booking_id, action, new_starts_at, coalesce(note, '') || case when _owner <> _me then ' (gestita da un collaboratore)' else '' end);
  if _owner <> _me then perform private.restore_claims(_prev); end if;
end;
$$;

create or replace function public.business_respond_inspection(profile_id uuid, appointment_id uuid, action text, new_starts_at timestamptz default null, note text default null,
  outcome text default null, mileage_km integer default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _owner uuid; _prev text; _me uuid := auth.uid();
begin
  if not private.business_can(business_respond_inspection.profile_id, 'prenotazioni') then raise exception 'Non hai il permesso di gestire le prenotazioni' using errcode = '42501'; end if;
  select user_id into _owner from public.professional_profiles where id = business_respond_inspection.profile_id;
  if not exists (select 1 from public.inspection_appointments a where a.id = appointment_id and a.center_profile_id = business_respond_inspection.profile_id) then
    raise exception 'Appuntamento non trovato' using errcode = 'P0002';
  end if;
  if action not in ('conferma', 'proponi', 'rifiuta', 'mancata_presentazione', 'completa', 'annulla') then raise exception 'Azione non valida' using errcode = '22023'; end if;
  perform private.business_log(business_respond_inspection.profile_id, 'revisione.' || action, jsonb_build_object('appointment_id', appointment_id, 'collaboratore', _me));
  if _owner <> _me then _prev := private.as_owner(_owner); end if;
  perform public.respond_inspection(appointment_id, action, new_starts_at, note, outcome, mileage_km);
  if _owner <> _me then perform private.restore_claims(_prev); end if;
end;
$$;

-- Prenotazioni e appuntamenti visibili ai collaboratori autorizzati.
create or replace function public.business_bookings(profile_id uuid)
returns table (source text, id uuid, title text, kind text, status text, starts_at timestamptz, proposed_starts_at timestamptz, customer_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare _owner uuid;
begin
  if not private.business_can(business_bookings.profile_id, 'prenotazioni') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  select user_id into _owner from public.professional_profiles where professional_profiles.id = business_bookings.profile_id;
  return query
  select 'prenotazione'::text, b.id, l.title, b.kind, b.status, b.starts_at, b.proposed_starts_at, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Cliente'), b.created_at
    from public.vehicle_bookings b join public.vehicle_listings l on l.id = b.listing_id left join public.profiles p on p.id = b.buyer_id
   where b.seller_id = _owner and (l.professional_profile_id = business_bookings.profile_id or l.professional_profile_id is null)
  union all
  select 'revisione', a.id, a.vehicle_desc, a.vehicle_category, a.status, a.starts_at, a.proposed_starts_at, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Cliente'), a.created_at
    from public.inspection_appointments a left join public.profiles p on p.id = a.user_id where a.center_profile_id = business_bookings.profile_id
  order by 6 desc nulls last
  limit 500;
end;
$$;

-- ---------------------------------------------------------------------
-- Limiti del piano applicati alle offerte (le altre risorse sono illimitate nel piano Free)
-- ---------------------------------------------------------------------
create or replace function private.offers_plan_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _lim public.plan_limits;
begin
  if new.status not in ('in_revisione', 'pubblicata') or (tg_op = 'UPDATE' and old.status in ('in_revisione', 'pubblicata')) then return new; end if;
  _lim := private.business_limits(new.profile_id);
  if _lim.max_active_offers is not null and (select count(*) from public.promotional_offers o where o.profile_id = new.profile_id and o.id <> new.id
       and o.status in ('in_revisione', 'pubblicata')) >= _lim.max_active_offers then
    raise exception 'Il piano attuale consente al massimo % offerte attive', _lim.max_active_offers using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger offers_plan_limit before insert or update of status on public.promotional_offers for each row execute function private.offers_plan_limit();

create or replace function private.listings_plan_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _lim public.plan_limits;
begin
  if new.professional_profile_id is null or new.status not in ('in_revisione', 'pubblicato') or (tg_op = 'UPDATE' and old.status in ('in_revisione', 'pubblicato', 'approvato')) then return new; end if;
  _lim := private.business_limits(new.professional_profile_id);
  if _lim.max_vehicle_listings is not null and (select count(*) from public.vehicle_listings l where l.professional_profile_id = new.professional_profile_id and l.id <> new.id
       and l.status in ('in_revisione', 'approvato', 'pubblicato')) >= _lim.max_vehicle_listings then
    raise exception 'Il piano attuale consente al massimo % annunci attivi', _lim.max_vehicle_listings using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger listings_plan_limit before insert or update of status on public.vehicle_listings for each row execute function private.listings_plan_limit();

create or replace function public.business_plan(profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare _l public.plan_limits;
begin
  if not private.business_can(business_plan.profile_id, 'accesso') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  _l := private.business_limits(business_plan.profile_id);
  return to_jsonb(_l) || jsonb_build_object('plan_name', (select name from public.subscription_plans where code = _l.plan_code),
    'members_used', (select count(*) from public.business_members m where m.profile_id = business_plan.profile_id and m.status <> 'revocato'),
    'offers_used', (select count(*) from public.promotional_offers o where o.profile_id = business_plan.profile_id and o.status in ('in_revisione', 'pubblicata')),
    'listings_used', (select count(*) from public.vehicle_listings l where l.professional_profile_id = business_plan.profile_id and l.status in ('in_revisione', 'approvato', 'pubblicato')));
end;
$$;

-- ---------------------------------------------------------------------
-- Amministrazione
-- ---------------------------------------------------------------------
create or replace function public.admin_business_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('business.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'partner_attivi', (select count(*) from public.professional_profiles where is_published and review_status = 'approvato' and deleted_at is null),
    'aziende_registrate', (select count(*) from public.professional_profiles where deleted_at is null),
    'per_tipo', (select coalesce(jsonb_object_agg(t, n), '{}'::jsonb) from (select professional_type::text t, count(*) n from public.professional_profiles where deleted_at is null group by 1) x),
    'con_team', (select count(distinct profile_id) from public.business_members where status = 'attivo'),
    'collaboratori_attivi', (select count(*) from public.business_members where status = 'attivo'),
    'richieste_30g', (select count(*) from public.requests where created_at > now() - interval '30 days'),
    'servizi_completati_30g', (select count(*) from public.requests where status = 'completata' and updated_at > now() - interval '30 days')
                              + (select count(*) from public.roadside_requests where status = 'completata' and completed_at > now() - interval '30 days')
                              + (select count(*) from public.transport_requests where status = 'completata' and completed_at > now() - interval '30 days')
                              + (select count(*) from public.vehicle_bookings where status = 'completato' and updated_at > now() - interval '30 days')
                              + (select count(*) from public.inspection_appointments where status = 'completato' and updated_at > now() - interval '30 days'),
    'annunci_pubblicati', (select count(*) from public.vehicle_listings where status = 'pubblicato'),
    'ricambi_pubblicati', (select count(*) from public.part_listings where status = 'pubblicato'),
    'attivita_aperte', (select count(*) from public.business_tasks where status = 'aperta'),
    'piani', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (select p.code, (select count(*) from public.business_plan_assignments a where a.plan_code = p.code)
              + case when p.code = 'free' then (select count(*) from public.professional_profiles pp where pp.deleted_at is null and not exists (select 1 from public.business_plan_assignments a where a.profile_id = pp.id)) else 0 end n
              from public.subscription_plans p) x),
    'segnalazioni_aperte', (select count(*) from public.content_reports where status in ('nuova', 'in_esame')));
end;
$$;

create or replace function public.admin_assign_plan(profile_id uuid, plan_code text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('business.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if not exists (select 1 from public.subscription_plans where code = plan_code and active) then raise exception 'Piano non attivo: l''attivazione dei piani richiede l''approvazione del fondatore' using errcode = '22023'; end if;
  insert into public.business_plan_assignments (profile_id, plan_code, assigned_by, note) values (admin_assign_plan.profile_id, plan_code, auth.uid(), note)
  on conflict (profile_id) do update set plan_code = excluded.plan_code, assigned_by = auth.uid(), note = excluded.note, updated_at = now();
  perform private.log_admin_action('business.plan', 'business_plan_assignments', profile_id::text, jsonb_build_object('plan', plan_code, 'note', note));
end;
$$;

create or replace function public.admin_set_plan_limits(plan_code text, limits jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('business.manage') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  update public.plan_limits l set
    max_vehicle_listings = case when limits ? 'max_vehicle_listings' then (limits ->> 'max_vehicle_listings')::integer else l.max_vehicle_listings end,
    max_part_listings = case when limits ? 'max_part_listings' then (limits ->> 'max_part_listings')::integer else l.max_part_listings end,
    max_members = coalesce((limits ->> 'max_members')::integer, l.max_members),
    max_active_offers = case when limits ? 'max_active_offers' then (limits ->> 'max_active_offers')::integer else l.max_active_offers end,
    analytics_days = coalesce((limits ->> 'analytics_days')::integer, l.analytics_days),
    exports_enabled = coalesce((limits ->> 'exports_enabled')::boolean, l.exports_enabled),
    promo_visibility = coalesce((limits ->> 'promo_visibility')::boolean, l.promo_visibility),
    advanced_features = coalesce((limits ->> 'advanced_features')::boolean, l.advanced_features),
    updated_at = now()
   where l.plan_code = admin_set_plan_limits.plan_code;
  if not found then raise exception 'Piano non trovato' using errcode = 'P0002'; end if;
  perform private.log_admin_action('business.plan_limits', 'plan_limits', plan_code, limits);
end;
$$;

-- RLS ------------------------------------------------------------------------
alter table public.plan_limits enable row level security;
alter table public.business_plan_assignments enable row level security;
alter table public.business_members enable row level security;
alter table public.business_audit enable row level security;
alter table public.business_lead_states enable row level security;
alter table public.business_lead_notes enable row level security;
alter table public.business_tasks enable row level security;
revoke all on public.plan_limits, public.business_plan_assignments, public.business_members, public.business_audit, public.business_lead_states,
  public.business_lead_notes, public.business_tasks from anon, authenticated;
grant all on public.plan_limits, public.business_plan_assignments, public.business_members, public.business_audit, public.business_lead_states,
  public.business_lead_notes, public.business_tasks to service_role;

grant select on public.plan_limits to anon, authenticated;
create policy "plan_limits: pubblici" on public.plan_limits for select to anon, authenticated using (true);
grant select on public.business_plan_assignments to authenticated;
create policy "plan_assignments: azienda e staff" on public.business_plan_assignments for select to authenticated
  using (private.business_can(profile_id, 'accesso') or private.has_permission('business.manage'));

grant select on public.business_members to authenticated;
create policy "business_members: team" on public.business_members for select to authenticated
  using (private.business_can(profile_id, 'team') or user_id = (select auth.uid()) or private.has_permission('business.manage'));
create policy "business_members: inviti ricevuti" on public.business_members for select to authenticated
  using (status = 'invitato' and invite_email = (select lower(email) from auth.users where id = (select auth.uid())));

grant select on public.business_audit to authenticated;
create policy "business_audit: titolare e amministratori" on public.business_audit for select to authenticated
  using (private.business_can(profile_id, 'team') or private.has_permission('business.manage'));

grant select on public.business_lead_states, public.business_lead_notes to authenticated;
create policy "lead_states: team" on public.business_lead_states for select to authenticated using (private.business_can(profile_id, 'lead'));
create policy "lead_notes: team" on public.business_lead_notes for select to authenticated using (private.business_can(profile_id, 'lead'));

grant select, insert, update, delete on public.business_tasks to authenticated;
create policy "tasks: team" on public.business_tasks for select to authenticated using (private.business_can(profile_id, 'attivita'));
create policy "tasks: crea" on public.business_tasks for insert to authenticated with check (private.business_can(profile_id, 'attivita'));
create policy "tasks: modifica" on public.business_tasks for update to authenticated using (private.business_can(profile_id, 'attivita')) with check (private.business_can(profile_id, 'attivita'));
create policy "tasks: elimina" on public.business_tasks for delete to authenticated using (private.business_can(profile_id, 'attivita') and (created_by = (select auth.uid()) or private.owns_profile(profile_id)));

do $$
declare _f text;
begin
  foreach _f in array array['public.invite_business_member(uuid, text, text, text[])', 'public.accept_business_invite(uuid)', 'public.update_business_member(uuid, text, text[], boolean)',
    'public.business_leads(uuid, timestamptz, timestamptz)', 'public.set_lead_status(uuid, text, uuid, text, uuid)', 'public.add_lead_note(uuid, text, uuid, text)',
    'public.business_stats(uuid, timestamptz, timestamptz)', 'public.business_profile_completeness(uuid)', 'public.business_respond_booking(uuid, uuid, text, timestamptz, text)',
    'public.business_respond_inspection(uuid, uuid, text, timestamptz, text, text, integer)', 'public.business_bookings(uuid)', 'public.business_plan(uuid)',
    'public.admin_business_overview()', 'public.admin_assign_plan(uuid, text, text)', 'public.admin_set_plan_limits(text, jsonb)'] loop
    execute format('revoke all on function %s from public, anon', _f);
    execute format('grant execute on function %s to authenticated', _f);
  end loop;
end $$;
grant execute on function private.business_can(uuid, text) to authenticated, service_role;
revoke all on function private.as_owner(uuid), private.restore_claims(text) from public, anon, authenticated;
revoke all on function private.bump_view(text, uuid) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-business-tasks', '*/15 * * * *', 'select private.process_business_tasks()');
  end if;
end $$;

-- Registro delle esportazioni (chi ha esportato cosa e quando).
create or replace function public.business_log_export(profile_id uuid, kind text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.business_can(business_log_export.profile_id, 'esportazioni') then raise exception 'Permesso negato' using errcode = '42501'; end if;
  perform private.business_log(business_log_export.profile_id, 'esportazione', jsonb_build_object('tipo', left(kind, 30)));
end;
$$;
revoke all on function public.business_log_export(uuid, text) from public, anon;
grant execute on function public.business_log_export(uuid, text) to authenticated;

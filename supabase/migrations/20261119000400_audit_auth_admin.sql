-- =====================================================================
-- AutoGarage24 — Migrazione 0004: audit log, registrazione automatica
-- dei profili e funzioni amministrative controllate.
-- =====================================================================

-- ---------------------------------------------------------------------
-- admin_audit_logs: registro immutabile delle operazioni amministrative.
-- ---------------------------------------------------------------------
create table public.admin_audit_logs (
  id            bigint generated always as identity primary key,
  actor_id      uuid references public.profiles (id) on delete set null,
  action        text not null check (char_length(action) between 3 and 80),
  target_table  text check (char_length(target_table) <= 80),
  target_id     text check (char_length(target_id) <= 80),
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.admin_audit_logs is
  'Registro delle operazioni amministrative. Solo inserimento: modifiche e cancellazioni sono bloccate.';

create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_table, target_id);

create or replace function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_logs è in sola aggiunta: % non consentito', tg_op
    using errcode = '42501';
end;
$$;

create trigger admin_audit_logs_no_update
  before update or delete on public.admin_audit_logs
  for each row execute function private.audit_logs_immutable();

alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from anon, authenticated;
grant select on table public.admin_audit_logs to authenticated;
grant select, insert on table public.admin_audit_logs to service_role;

create policy "admin_audit_logs: lettura amministratori"
  on public.admin_audit_logs for select
  to authenticated
  using ((select private.is_admin()));

create or replace function private.log_admin_action(
  _action text, _target_table text, _target_id text, _details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values ((select auth.uid()), _action, _target_table, _target_id, coalesce(_details, '{}'::jsonb));
$$;
revoke all on function private.log_admin_action(text, text, text, jsonb) from public;

-- ---------------------------------------------------------------------
-- Creazione automatica di profilo e ruolo alla registrazione.
-- Il ruolo richiesto arriva dai metadati di registrazione, ma viene
-- accettato SOLO se è un ruolo non amministrativo. "admin" non è mai
-- assegnabile da qui. L'autorizzazione usa sempre user_roles, mai i
-- metadati del token.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  _requested     text := _meta ->> 'requested_role';
  _role          public.app_role := 'cliente';
  _full_name     text := nullif(left(trim(_meta ->> 'full_name'), 120), '');
  _business_name text := nullif(left(trim(_meta ->> 'business_name'), 120), '');
  _display_name  text;
begin
  if _requested in ('cliente', 'officina', 'meccanico', 'venditore_auto', 'venditore_ricambi') then
    _role := _requested::public.app_role;
  end if;

  insert into public.profiles (id, email, full_name, terms_accepted_at, marketing_consent)
  values (
    new.id,
    coalesce(new.email, ''),
    _full_name,
    case when (_meta ->> 'accepted_terms') = 'true' then now() else null end,
    coalesce((_meta ->> 'marketing_consent') = 'true', false)
  );

  insert into public.user_roles (user_id, role) values (new.id, _role);

  if private.is_professional_role(_role) then
    _display_name := coalesce(_business_name, _full_name, 'Professionista');
    if char_length(_display_name) < 2 then
      _display_name := 'Professionista';
    end if;
    insert into public.professional_profiles (user_id, professional_type, display_name, slug)
    values (
      new.id,
      _role,
      _display_name,
      coalesce(nullif(private.slugify(_display_name), ''), 'professionista')
        || '-' || substr(replace(new.id::text, '-', ''), 1, 8)
    );
  end if;

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Mantiene allineata l'email del profilo con quella di Supabase Auth.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;
revoke all on function private.handle_user_email_change() from public;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Funzioni amministrative (chiamabili via RPC).
-- Ogni funzione verifica i privilegi di amministratore e scrive l'audit log.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_account_status(
  target_user uuid, new_status public.account_status, reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _old public.account_status;
begin
  if not private.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'Non puoi modificare lo stato del tuo stesso account' using errcode = '42501';
  end if;
  if reason is not null and char_length(reason) > 500 then
    raise exception 'Motivazione troppo lunga (max 500 caratteri)' using errcode = '22001';
  end if;

  select account_status into _old from public.profiles where id = target_user for update;
  if not found then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;

  update public.profiles
     set account_status = new_status, status_reason = reason
   where id = target_user;

  perform private.log_admin_action(
    'account.status_changed', 'profiles', target_user::text,
    jsonb_build_object('from', _old, 'to', new_status, 'reason', reason));
end;
$$;

create or replace function public.admin_grant_role(target_user uuid, role_to_grant public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user, role_to_grant, (select auth.uid()))
  on conflict (user_id, role) do nothing;

  perform private.log_admin_action(
    'role.granted', 'user_roles', target_user::text, jsonb_build_object('role', role_to_grant));
end;
$$;

create or replace function public.admin_revoke_role(target_user uuid, role_to_revoke public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if role_to_revoke = 'admin' and target_user = (select auth.uid()) then
    raise exception 'Non puoi revocare il tuo stesso ruolo di amministratore' using errcode = '42501';
  end if;

  delete from public.user_roles where user_id = target_user and role = role_to_revoke;

  -- Un profilo professionale senza il ruolo corrispondente non resta pubblico.
  update public.professional_profiles
     set is_published = false
   where user_id = target_user and professional_type = role_to_revoke;

  perform private.log_admin_action(
    'role.revoked', 'user_roles', target_user::text, jsonb_build_object('role', role_to_revoke));
end;
$$;

-- Esito di una richiesta di verifica. L'approvazione attiva il badge
-- corrispondente; il rifiuto non tocca i badge esistenti.
create or replace function public.admin_review_verification(
  request_id uuid, decision public.verification_status, note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _req public.verification_requests%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if decision not in ('in_revisione', 'approvata', 'rifiutata') then
    raise exception 'Esito non valido' using errcode = '22023';
  end if;
  if decision = 'rifiutata' and coalesce(trim(note), '') = '' then
    raise exception 'Indica la motivazione del rifiuto' using errcode = '22023';
  end if;

  select * into _req from public.verification_requests where id = request_id for update;
  if not found then
    raise exception 'Richiesta non trovata' using errcode = 'P0002';
  end if;
  if _req.status not in ('in_attesa', 'in_revisione') then
    raise exception 'La richiesta è già stata chiusa' using errcode = '22023';
  end if;

  update public.verification_requests
     set status = decision,
         decision_note = note,
         reviewed_by = case when decision = 'in_revisione' then reviewed_by else (select auth.uid()) end,
         reviewed_at = case when decision = 'in_revisione' then reviewed_at else now() end
   where id = request_id;

  if decision = 'approvata' then
    update public.professional_profiles
       set identity_verified_at = case when _req.verification_type = 'identita' then now() else identity_verified_at end,
           business_verified_at = case when _req.verification_type = 'attivita_professionale' then now() else business_verified_at end,
           documents_checked_at = case when _req.verification_type = 'documentazione' then now() else documents_checked_at end
     where user_id = _req.user_id;
  end if;

  perform private.log_admin_action(
    'verification.reviewed', 'verification_requests', request_id::text,
    jsonb_build_object('decision', decision, 'type', _req.verification_type, 'user_id', _req.user_id, 'note', note));
end;
$$;

-- Revoca di un badge (es. documentazione scaduta).
create or replace function public.admin_clear_badge(
  target_user uuid, badge public.verification_type, reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if coalesce(trim(reason), '') = '' then
    raise exception 'Indica la motivazione' using errcode = '22023';
  end if;

  update public.professional_profiles
     set identity_verified_at = case when badge = 'identita' then null else identity_verified_at end,
         business_verified_at = case when badge = 'attivita_professionale' then null else business_verified_at end,
         documents_checked_at = case when badge = 'documentazione' then null else documents_checked_at end
   where user_id = target_user;

  perform private.log_admin_action(
    'verification.badge_cleared', 'professional_profiles', target_user::text,
    jsonb_build_object('badge', badge, 'reason', reason));
end;
$$;

-- Le funzioni amministrative non sono eseguibili da utenti anonimi.
revoke all on function public.admin_set_account_status(uuid, public.account_status, text) from public, anon;
revoke all on function public.admin_grant_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_revoke_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_review_verification(uuid, public.verification_status, text) from public, anon;
revoke all on function public.admin_clear_badge(uuid, public.verification_type, text) from public, anon;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_grant_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_revoke_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_review_verification(uuid, public.verification_status, text) to authenticated;
grant execute on function public.admin_clear_badge(uuid, public.verification_type, text) to authenticated;

-- ---------------------------------------------------------------------
-- Primo amministratore. Eseguibile SOLO con la chiave service_role
-- (script `npm run admin:bootstrap`) e SOLO se non esiste ancora alcun
-- amministratore. Gli amministratori successivi si nominano dal pannello.
-- ---------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Esiste già un amministratore: usa il pannello di amministrazione' using errcode = '42501';
  end if;

  select id into _user_id from public.profiles where lower(email) = lower(trim(target_email));
  if _user_id is null then
    raise exception 'Nessun utente registrato con questa email' using errcode = 'P0002';
  end if;

  insert into public.user_roles (user_id, role) values (_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (null, 'role.bootstrap_admin', 'user_roles', _user_id::text,
          jsonb_build_object('email', lower(trim(target_email))));

  return _user_id;
end;
$$;
revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;

-- =====================================================================
-- AutoGarage24 — Migrazione 0007 (Fase 10): RBAC con permessi granulari
-- =====================================================================

create table public.role_permissions (
  role        public.app_role not null,
  permission  text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  primary key (role, permission)
);
comment on table public.role_permissions is
  'Permessi concessi a ciascun ruolo di staff. Modificabile solo via migrazione (nessun accesso API in scrittura).';

insert into public.role_permissions (role, permission)
select 'super_admin'::public.app_role, p from unnest(array[
  'users.view','users.manage','roles.manage','roles.manage_admins','listings.moderate','professionals.verify',
  'reports.manage','reviews.moderate','support.manage','content.manage','neo_rules.manage','field.manage',
  'categories.manage','audit.view','conversations.moderate','stats.view','plans.manage','gdpr.manage']) p
union all
select 'admin'::public.app_role, p from unnest(array[
  'users.view','users.manage','roles.manage','listings.moderate','professionals.verify','reports.manage',
  'reviews.moderate','support.manage','content.manage','neo_rules.manage','field.manage','categories.manage',
  'audit.view','conversations.moderate','stats.view','plans.manage','gdpr.manage']) p
union all
select 'moderatore'::public.app_role, p from unnest(array[
  'users.view','listings.moderate','reports.manage','reviews.moderate','stats.view']) p
union all
select 'operatore_assistenza'::public.app_role, p from unnest(array[
  'users.view','support.manage','reports.manage']) p;

alter table public.role_permissions enable row level security;
revoke all on table public.role_permissions from anon, authenticated;
grant select on table public.role_permissions to authenticated;
grant all on table public.role_permissions to service_role;
create policy "role_permissions: lettura utenti autenticati"
  on public.role_permissions for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Funzioni di autorizzazione
-- ---------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.has_role('admin'::public.app_role) or private.has_role('super_admin'::public.app_role);
$$;

create or replace function private.has_permission(_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and rp.permission = _permission
      and p.account_status = 'attivo'
      and p.deleted_at is null
  );
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin','super_admin','moderatore','operatore_assistenza')
      and p.account_status = 'attivo' and p.deleted_at is null
  );
$$;

revoke all on function private.has_permission(text) from public;
revoke all on function private.is_staff() from public;
grant execute on function private.has_permission(text) to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;

-- Lo staff con permesso users.view legge profili e ruoli.
create policy "profiles: lettura staff autorizzato"
  on public.profiles for select to authenticated
  using ((select private.has_permission('users.view')));
create policy "user_roles: lettura staff autorizzato"
  on public.user_roles for select to authenticated
  using ((select private.has_permission('users.view')));
create policy "admin_audit_logs: lettura con permesso audit"
  on public.admin_audit_logs for select to authenticated
  using ((select private.has_permission('audit.view')));

-- ---------------------------------------------------------------------
-- Gestione ruoli: nessuno modifica i propri privilegi; solo il super
-- amministratore assegna o revoca ruoli amministrativi.
-- ---------------------------------------------------------------------
create or replace function public.admin_grant_role(target_user uuid, role_to_grant public.app_role)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('roles.manage') then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'Non puoi modificare i tuoi stessi privilegi' using errcode = '42501';
  end if;
  if role_to_grant in ('admin','super_admin') and not private.has_permission('roles.manage_admins') then
    raise exception 'Solo il super amministratore può nominare amministratori' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;
  insert into public.user_roles (user_id, role, granted_by)
  values (target_user, role_to_grant, (select auth.uid()))
  on conflict (user_id, role) do nothing;
  perform private.log_admin_action('role.granted', 'user_roles', target_user::text, jsonb_build_object('role', role_to_grant));
end;
$$;

create or replace function public.admin_revoke_role(target_user uuid, role_to_revoke public.app_role)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('roles.manage') then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'Non puoi modificare i tuoi stessi privilegi' using errcode = '42501';
  end if;
  if role_to_revoke in ('admin','super_admin') and not private.has_permission('roles.manage_admins') then
    raise exception 'Solo il super amministratore può revocare ruoli amministrativi' using errcode = '42501';
  end if;
  if role_to_revoke = 'super_admin'
     and (select count(*) from public.user_roles where role = 'super_admin') <= 1 then
    raise exception 'Deve restare almeno un super amministratore' using errcode = '42501';
  end if;
  delete from public.user_roles where user_id = target_user and role = role_to_revoke;
  update public.professional_profiles set is_published = false
   where user_id = target_user and professional_type = role_to_revoke;
  perform private.log_admin_action('role.revoked', 'user_roles', target_user::text, jsonb_build_object('role', role_to_revoke));
end;
$$;

create or replace function public.admin_set_account_status(
  target_user uuid, new_status public.account_status, reason text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare _old public.account_status;
begin
  if not private.has_permission('users.manage') then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'Non puoi modificare lo stato del tuo stesso account' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_roles where user_id = target_user and role = 'super_admin')
     and not private.has_permission('roles.manage_admins') then
    raise exception 'Solo un super amministratore può sospendere un super amministratore' using errcode = '42501';
  end if;
  if reason is not null and char_length(reason) > 500 then
    raise exception 'Motivazione troppo lunga (max 500 caratteri)' using errcode = '22001';
  end if;
  select account_status into _old from public.profiles where id = target_user for update;
  if not found then raise exception 'Utente non trovato' using errcode = 'P0002'; end if;
  update public.profiles set account_status = new_status, status_reason = reason where id = target_user;
  perform private.log_admin_action('account.status_changed', 'profiles', target_user::text,
    jsonb_build_object('from', _old, 'to', new_status, 'reason', reason));
end;
$$;

-- Il primo amministratore (fondatore) riceve anche il ruolo di super amministratore.
create or replace function public.bootstrap_first_admin(target_email text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _user_id uuid;
begin
  if exists (select 1 from public.user_roles where role in ('admin','super_admin')) then
    raise exception 'Esiste già un amministratore: usa il pannello di amministrazione' using errcode = '42501';
  end if;
  select id into _user_id from public.profiles where lower(email) = lower(trim(target_email));
  if _user_id is null then
    raise exception 'Nessun utente registrato con questa email' using errcode = 'P0002';
  end if;
  insert into public.user_roles (user_id, role) values (_user_id, 'admin'), (_user_id, 'super_admin')
  on conflict (user_id, role) do nothing;
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (null, 'role.bootstrap_admin', 'user_roles', _user_id::text, jsonb_build_object('email', lower(trim(target_email))));
  return _user_id;
end;
$$;
revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;

-- ---------------------------------------------------------------------
-- Utilità condivise dalle fasi successive
-- ---------------------------------------------------------------------
-- Slug univoco: base leggibile + suffisso casuale breve.
create or replace function private.unique_slug(_base text)
returns text language sql volatile set search_path = ''
as $$
  select left(coalesce(nullif(private.slugify(_base), ''), 'elemento'), 70)
         || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
$$;
grant execute on function private.unique_slug(text) to authenticated, service_role;

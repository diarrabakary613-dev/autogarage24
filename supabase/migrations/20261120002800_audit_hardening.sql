-- =====================================================================
-- Migrazione 0028 — Fase 34: correzioni dell'audit
--  P1  esportazione dei dati personali incompleta (dati delle fasi 21–32);
--  P1  cancellazione account: dati delle nuove aree non trattati, email ancora leggibile nel profilo;
--  P2  indici mancanti su chiavi esterne usate da RLS, liste e cancellazioni a cascata;
--  P2  registro errori dell'applicazione senza dati personali + controllo di salute;
--  P3  funzioni eseguibili da utenti anonimi senza necessità.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Esportazione completa (diritto di accesso e portabilità)
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  return jsonb_build_object(
    'generato_il', now(),
    'profilo', (select to_jsonb(p) from public.profiles p where p.id = _uid),
    'ruoli', (select coalesce(jsonb_agg(r.role), '[]') from public.user_roles r where r.user_id = _uid),
    'profilo_professionale', (select to_jsonb(pp) from public.professional_profiles pp where pp.user_id = _uid),
    'dati_aziendali', (select to_jsonb(b) from public.business_profiles b where b.user_id = _uid),
    'profilo_neopatentato', (select to_jsonb(d) from public.driver_profiles d where d.user_id = _uid),
    'preferenze_notifiche', (select to_jsonb(n) from public.notification_preferences n where n.user_id = _uid),
    'annunci_auto', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.vehicle_listings l where l.owner_id = _uid),
    'annunci_ricambi', (select coalesce(jsonb_agg(to_jsonb(pl)), '[]') from public.part_listings pl where pl.owner_id = _uid),
    'preferiti', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.favorites f where f.user_id = _uid),
    'richieste', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.requests r where r.requester_id = _uid or r.recipient_id = _uid),
    'messaggi_inviati', (select coalesce(jsonb_agg(jsonb_build_object('conversazione', m.conversation_id, 'testo', m.body, 'data', m.created_at)), '[]')
                         from public.messages m where m.sender_id = _uid),
    'garage', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.user_vehicles v where v.owner_id = _uid),
    'manutenzione', (select coalesce(jsonb_agg(to_jsonb(mr)), '[]') from public.maintenance_records mr where mr.owner_id = _uid),
    'promemoria', (select coalesce(jsonb_agg(to_jsonb(rm)), '[]') from public.maintenance_reminders rm where rm.owner_id = _uid),
    'spese', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from public.vehicle_expenses e where e.owner_id = _uid),
    'documenti', (select coalesce(jsonb_agg(jsonb_build_object('titolo', d.title, 'categoria', d.category, 'data', d.document_date)), '[]')
                  from public.user_vehicle_documents d where d.owner_id = _uid),
    'recensioni_scritte', (select coalesce(jsonb_agg(to_jsonb(rv)), '[]') from public.reviews rv where rv.author_id = _uid),
    'segnalazioni', (select coalesce(jsonb_agg(to_jsonb(cr)), '[]') from public.content_reports cr where cr.reporter_id = _uid),
    'assistenza', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.support_tickets t where t.user_id = _uid),
    -- Fasi 21–32
    'offerte_richieste', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.offer_claims c where c.user_id = _uid),
    'visite_e_test_drive', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.vehicle_bookings b where b.buyer_id = _uid or b.seller_id = _uid),
    'soccorso_stradale', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.roadside_requests r where r.user_id = _uid),
    'trasporti', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.transport_requests t where t.user_id = _uid),
    'revisioni', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.inspection_appointments a where a.user_id = _uid),
    'richieste_assicurative', (select coalesce(jsonb_agg(to_jsonb(q)), '[]') from public.insurance_quote_requests q where q.user_id = _uid),
    'valutazioni', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.vehicle_valuations v where v.user_id = _uid),
    'richieste_di_valutazione', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.valuation_requests v where v.user_id = _uid),
    'permute', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.trade_in_proposals t where t.buyer_id = _uid or t.seller_id = _uid),
    'team_aziendali', (select coalesce(jsonb_agg(jsonb_build_object('attivita', m.profile_id, 'ruolo', m.role, 'stato', m.status)), '[]') from public.business_members m where m.user_id = _uid),
    'rewards_movimenti', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]') from public.points_ledger l where l.user_id = _uid),
    'rewards_premi', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reward_redemptions r where r.user_id = _uid),
    'inviti_inviati', (select coalesce(jsonb_agg(jsonb_build_object('programma', r.program, 'stato', r.status, 'data', r.created_at)), '[]') from public.referrals r where r.referrer_id = _uid),
    'codice_invito', (select code from public.referral_codes where user_id = _uid),
    'provenienza_registrazione', (select to_jsonb(a) - 'user_id' from public.user_acquisition a where a.user_id = _uid),
    'storico_consensi_marketing', (select coalesce(jsonb_agg(jsonb_build_object('consenso', c.consent, 'fonte', c.source, 'data', c.created_at)), '[]') from public.marketing_consent_log c where c.user_id = _uid),
    'comunicazioni_promozionali', (select coalesce(jsonb_agg(jsonb_build_object('canale', s.channel, 'stato', s.status, 'data', s.created_at)), '[]') from public.marketing_sends s where s.user_id = _uid),
    'notifiche', (select coalesce(jsonb_agg(jsonb_build_object('titolo', n.title, 'categoria', n.category, 'data', n.created_at)), '[]') from public.notifications n where n.user_id = _uid)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Cancellazione: estensione alle aree delle fasi 21–32
-- ---------------------------------------------------------------------
create or replace function private.erase_user_data(_u uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('ag24.trusted', 'on', true);
  perform set_config('ag24.consent_source', 'cancellazione', true);
  -- L'email resta solo nell'account di autenticazione (da eliminare dalla console dopo i termini di conservazione).
  update public.profiles set email = 'eliminato-' || _u::text || '@invalid.local', marketing_consent = false where id = _u;
  delete from public.notification_preferences where user_id = _u;
  delete from public.notifications where user_id = _u;
  delete from public.favorites where user_id = _u;
  delete from public.push_subscriptions where user_id = _u;
  delete from public.user_acquisition where user_id = _u;
  delete from public.email_unsubscribe_tokens where user_id = _u;
  update public.email_outbox set status = 'annullata' where user_id = _u and status in ('in_coda', 'errore');
  update public.referral_codes set active = false where user_id = _u;
  update public.business_members set status = 'revocato' where user_id = _u and status <> 'revocato';
  update public.offer_claims set status = 'annullato' where user_id = _u and status in ('richiesto', 'confermato');
  update public.vehicle_bookings set status = 'annullato' where (buyer_id = _u or seller_id = _u) and status in ('in_attesa', 'confermato', 'modifica_proposta');
  update public.reward_redemptions set status = 'revocato', cancel_reason = 'Account eliminato' where user_id = _u and status = 'emesso';
  update public.promotional_coupons set active = false where assigned_user_id = _u;
  delete from public.insurance_quote_requests where user_id = _u;
  update public.reward_items set status = 'sospeso' where profile_id in (select id from public.professional_profiles where user_id = _u) and status = 'pubblicato';
  perform set_config('ag24.trusted', 'off', true);
end;
$$;
revoke all on function private.erase_user_data(uuid) from public, anon, authenticated;

create or replace function public.admin_process_deletion(request_id uuid, decision text, note text)
returns void language plpgsql security definer set search_path = ''
as $$
declare _req public.account_deletion_requests%rowtype;
begin
  if not private.has_permission('gdpr.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if coalesce(trim(note), '') = '' then raise exception 'Indica la motivazione o gli obblighi di conservazione considerati' using errcode = '22023'; end if;
  select * into _req from public.account_deletion_requests where id = request_id for update;
  if not found then raise exception 'Richiesta non trovata' using errcode = 'P0002'; end if;
  update public.account_deletion_requests set status = decision, staff_note = note, processed_at = now(), processed_by = auth.uid()
   where id = request_id;
  if decision = 'completata' then
    update public.profiles set account_status = 'disattivato', deleted_at = now(), full_name = null, phone = null, city = null,
           postal_code = null, avatar_path = null, marketing_consent = false
     where id = _req.user_id;
    update public.professional_profiles set is_published = false, deleted_at = now() where user_id = _req.user_id;
    update public.vehicle_listings set status = 'sospeso', status_note = 'Account eliminato'
     where owner_id = _req.user_id and status in ('pubblicato', 'approvato', 'in_revisione');
    delete from public.user_vehicles where owner_id = _req.user_id;
    delete from public.driver_profiles where user_id = _req.user_id;
    perform private.erase_user_data(_req.user_id);
  end if;
  perform private.log_admin_action('gdpr.deletion_' || decision, 'account_deletion_requests', request_id::text, jsonb_build_object('note', note));
end;
$$;

-- ---------------------------------------------------------------------
-- Registro errori dell'applicazione (senza dati personali) e salute
-- ---------------------------------------------------------------------
create table public.app_errors (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  source      text not null check (source in ('client', 'server')),
  path        text check (path ~ '^/[A-Za-z0-9/_.-]{0,199}$'),
  message     text not null check (char_length(message) <= 300),
  digest      text check (digest ~ '^[A-Za-z0-9_-]{1,64}$'),
  device      text check (device in ('mobile', 'tablet', 'desktop'))
);
create index app_errors_time_idx on public.app_errors (occurred_at desc);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
grant all on public.app_errors to service_role;
grant select on public.app_errors to authenticated;
create policy "app_errors: staff" on public.app_errors for select to authenticated using (private.has_permission('stats.view'));

-- I messaggi vengono ripuliti da email, numeri lunghi, token e UUID prima del salvataggio.
create or replace function private.scrub(_t text)
returns text language sql immutable set search_path = ''
as $$
  select left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(_t, ''),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '[id]', 'g'),
    '[A-Za-z0-9_-]{32,}', '[token]', 'g'),
    '\+?[0-9][0-9 .-]{6,}[0-9]', '[numero]', 'g'), 300);
$$;

create or replace function public.report_client_error(p_message text, p_path text default null, p_digest text default null, p_device text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_message is null or char_length(trim(p_message)) = 0 then return; end if;
  -- Protezione dal volume anomalo
  if (select count(*) from public.app_errors where occurred_at > now() - interval '1 minute') > 200 then return; end if;
  insert into public.app_errors (source, path, message, digest, device)
  values ('client', case when p_path ~ '^/[A-Za-z0-9/_.-]{0,199}$' then p_path end, private.scrub(p_message),
          case when p_digest ~ '^[A-Za-z0-9_-]{1,64}$' then p_digest end, case when p_device in ('mobile', 'tablet', 'desktop') then p_device end);
end;
$$;
revoke all on function public.report_client_error(text, text, text, text) from public;
grant execute on function public.report_client_error(text, text, text, text) to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('database', 'ok', 'time', now()); $$;
revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;

create or replace function private.purge_app_errors()
returns void language sql security definer set search_path = ''
as $$ delete from public.app_errors where occurred_at < now() - interval '90 days'; $$;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ag24-purge-app-errors', '40 4 * * *', 'select private.purge_app_errors()');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Funzioni che non devono essere eseguibili senza accesso
-- ---------------------------------------------------------------------
revoke execute on function public.my_businesses() from public, anon;
revoke execute on function public.request_vehicle_info(uuid) from public, anon;
grant execute on function public.my_businesses() to authenticated;
grant execute on function public.request_vehicle_info(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Indici sulle chiavi esterne usate da RLS, elenchi e cancellazioni
-- ---------------------------------------------------------------------
create index if not exists verification_documents_owner_idx on public.verification_documents (owner_id);
create index if not exists professional_certifications_profile_idx on public.professional_certifications (profile_id);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists requests_pro_profile_idx on public.requests (professional_profile_id);
create index if not exists favorites_listing_idx on public.favorites (listing_id) where listing_id is not null;
create index if not exists favorites_offer_idx on public.favorites (offer_id) where offer_id is not null;
create index if not exists favorites_part_idx on public.favorites (part_id) where part_id is not null;
create index if not exists favorites_profile_idx on public.favorites (professional_profile_id) where professional_profile_id is not null;
create index if not exists reviews_author_idx on public.reviews (author_id);
create index if not exists part_listings_pro_profile_idx on public.part_listings (professional_profile_id);
create index if not exists maintenance_records_owner_idx on public.maintenance_records (owner_id);
create index if not exists work_reports_owner_idx on public.work_reports (owner_id);
create index if not exists work_reports_profile_idx on public.work_reports (professional_profile_id);
create index if not exists maintenance_reminders_owner_idx on public.maintenance_reminders (owner_id);
create index if not exists maintenance_reminders_vehicle_idx on public.maintenance_reminders (user_vehicle_id);
create index if not exists user_vehicle_documents_vehicle_idx on public.user_vehicle_documents (user_vehicle_id);
create index if not exists vehicle_expenses_vehicle_idx on public.vehicle_expenses (user_vehicle_id);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id);
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id);
create index if not exists promotional_offers_owner_idx on public.promotional_offers (owner_id);
create index if not exists promotional_coupons_profile_idx on public.promotional_coupons (profile_id);
create index if not exists promotional_coupons_assigned_idx on public.promotional_coupons (assigned_user_id) where assigned_user_id is not null;
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions (user_id);
create index if not exists vehicle_bookings_listing_idx on public.vehicle_bookings (listing_id);
create index if not exists roadside_quotes_profile_idx on public.roadside_quotes (profile_id);
create index if not exists transport_quotes_profile_idx on public.transport_quotes (profile_id);
create index if not exists inspection_records_owner_idx on public.inspection_records (owner_id);
create index if not exists valuation_requests_user_idx on public.valuation_requests (user_id);
create index if not exists valuation_offers_profile_idx on public.valuation_offers (profile_id);
create index if not exists business_members_user_idx on public.business_members (user_id);
create index if not exists email_outbox_user_idx on public.email_outbox (user_id);
create index if not exists reward_items_profile_idx on public.reward_items (profile_id);
create index if not exists insurance_partner_users_user_idx on public.insurance_partner_users (user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists trade_in_proposals_listing_idx on public.trade_in_proposals (listing_id);

-- ---------------------------------------------------------------------
-- 0030 — Fase 35: supporto clienti e cruscotto di lancio.
--  1. Nuove categorie di assistenza: «reclamo» e «partner» (supporto ai
--     professionisti). I reclami generano un avviso specifico allo staff.
--  2. public.admin_launch_kpis(days): metriche di lancio calcolate SOLO da
--     dati ed eventi reali (marketplace, partner, clienti, marketing).
--     Nessun valore stimato: se un dato non esiste, il valore è null.
-- Migrazione non distruttiva: nessun dato modificato o cancellato.
-- ---------------------------------------------------------------------

alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets add constraint support_tickets_category_check check (category in (
  'account', 'annunci', 'acquisto_vendita', 'officine', 'meccanici', 'ricambi', 'funzionamento', 'privacy',
  'segnalazioni', 'reclamo', 'partner', 'altro'));

create or replace function private.staff_alert_ticket()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.notify_staff('support.manage',
    case new.category when 'reclamo' then 'Nuovo reclamo' when 'partner' then 'Nuova richiesta di supporto partner' else 'Nuova richiesta di assistenza' end,
    new.subject, '/admin/supporto', 'tkt:' || new.id);
  return null;
end;
$$;

create or replace function public.admin_launch_kpis(days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  _days integer := least(greatest(coalesce(days, 30), 1), 730);
  _since timestamptz := now() - make_interval(days => least(greatest(coalesce(days, 30), 1), 730));
  _spend bigint;
  _paid_signups bigint;
begin
  if not (private.has_permission('analytics.view') or private.has_permission('stats.view')) then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;

  select sum(coalesce(actual_cents, 0)) into _spend from public.ad_budget_entries
  where actual_cents is not null and period_end >= _since::date;
  select count(*) into _paid_signups from public.user_acquisition
  where created_at >= _since and utm_medium in ('cpc', 'ppc', 'paid', 'paid_social', 'ads', 'display');

  return jsonb_build_object(
    'giorni', _days,
    'generato_il', now(),
    'marketplace', jsonb_build_object(
      'auto_pubblicate_totale', (select count(*) from public.vehicle_listings where status = 'pubblicato'),
      'auto_pubblicate_periodo', (select count(*) from public.vehicle_listings where published_at >= _since),
      'auto_neopatentati_compatibili', (select count(*) from public.vehicle_listings where status = 'pubblicato' and neo_result = 'compatibile'),
      'auto_vendute_periodo', (select count(*) from public.vehicle_listings where sold_at >= _since),
      'auto_in_revisione', (select count(*) from public.vehicle_listings where status = 'in_revisione'),
      'ricambi_pubblicati', (select count(*) from public.part_listings where status = 'pubblicato'),
      'visualizzazioni_annunci', (select coalesce(sum(views), 0) from public.daily_view_counts where target_kind in ('annuncio', 'ricambio') and day >= _since::date),
      'richieste_su_auto', (select count(*) from public.requests where kind in ('info_auto', 'appuntamento_auto') and created_at >= _since),
      'prenotazioni_visite', (select count(*) from public.vehicle_bookings where created_at >= _since),
      'contatti_generati', (select count(*) from public.requests where created_at >= _since)
        + (select count(*) from public.vehicle_bookings where created_at >= _since)
        + (select count(*) from public.offer_claims where created_at >= _since)),
    'partner', jsonb_build_object(
      'registrati', (select count(*) from public.professional_profiles where deleted_at is null),
      'registrati_periodo', (select count(*) from public.professional_profiles where deleted_at is null and created_at >= _since),
      'da_approvare', (select count(*) from public.professional_profiles where deleted_at is null and review_status = 'inviato'),
      'verificati', (select count(*) from public.professional_profiles where deleted_at is null and review_status = 'approvato'),
      'con_badge_attivita', (select count(*) from public.professional_profiles where deleted_at is null and business_verified_at is not null),
      'pubblicati', (select count(*) from public.professional_profiles where deleted_at is null and is_published and review_status = 'approvato'),
      'attivi_periodo', (select count(distinct r.professional_profile_id) from public.requests r join public.messages m on m.conversation_id = r.conversation_id
        where r.professional_profile_id is not null and m.sender_id = r.recipient_id and m.kind = 'testo' and m.created_at >= _since),
      'per_tipo', (select coalesce(jsonb_object_agg(t, n), '{}'::jsonb) from (select professional_type::text t, count(*) n from public.professional_profiles
        where deleted_at is null and is_published and review_status = 'approvato' group by 1) x),
      'richieste_ricevute', (select count(*) from public.requests where recipient_id is not null and created_at >= _since),
      'richieste_con_risposta', (select count(*) from public.requests r where r.created_at >= _since and r.recipient_id is not null and (
        r.status not in ('nuova', 'visualizzata', 'annullata')
        or exists (select 1 from public.messages m where m.conversation_id = r.conversation_id and m.sender_id = r.recipient_id and m.kind = 'testo'))),
      'tempo_medio_risposta_ore', (select round(avg(extract(epoch from (f.first_at - r.created_at)) / 3600)::numeric, 1)
        from public.requests r
        cross join lateral (select least(
          (select min(m.created_at) from public.messages m where m.conversation_id = r.conversation_id and m.sender_id = r.recipient_id and m.kind = 'testo'),
          (select min(e.created_at) from public.request_events e where e.request_id = r.id and e.actor_id = r.recipient_id)) as first_at) f
        where r.created_at >= _since and r.recipient_id is not null and f.first_at is not null),
      'preventivi_inviati', (select count(*) from public.quotes where created_at >= _since),
      'preventivi_accettati', (select count(*) from public.quotes where status = 'accettato' and decided_at >= _since)),
    'clienti', jsonb_build_object(
      'registrazioni', (select count(*) from public.profiles where created_at >= _since and deleted_at is null),
      'utenti_totali', (select count(*) from public.profiles where deleted_at is null and account_status = 'attivo'),
      'utenti_attivi', (select count(distinct u) from (
        select user_id u from public.activity_events where created_at >= _since
        union select sender_id from public.messages where created_at >= _since and kind = 'testo'
        union select requester_id from public.requests where created_at >= _since
        union select buyer_id from public.vehicle_bookings where created_at >= _since
        union select user_id from public.favorites where created_at >= _since) a where u is not null),
      'ricerche', (select count(*) from public.analytics_events where event in ('ricerca_auto', 'ricerca_officine', 'ricerca_ricambi', 'mappa_ricerca') and occurred_at >= _since),
      'calcoli_neopatentati', (select count(*) from public.analytics_events where event = 'calcolo_neopatentati' and occurred_at >= _since),
      'richieste_preventivo', (select count(*) from public.requests where kind in ('preventivo', 'preventivo_ricambio') and created_at >= _since)
        + (select count(*) from public.repair_requests where created_at >= _since),
      'appuntamenti', (select count(*) from public.appointments where created_at >= _since)
        + (select count(*) from public.vehicle_bookings where created_at >= _since)
        + (select count(*) from public.inspection_appointments where created_at >= _since),
      'appuntamenti_confermati', (select count(*) from public.appointments where status in ('confermato', 'completato') and created_at >= _since)
        + (select count(*) from public.vehicle_bookings where status in ('confermato', 'completato') and created_at >= _since)
        + (select count(*) from public.inspection_appointments where status in ('confermato', 'completato') and created_at >= _since)),
    'marketing', jsonb_build_object(
      'ingressi', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since),
      'traffico_organico', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since
        and utm_source is null and referrer_host ~ '(^|\.)(google|bing|duckduckgo|yahoo|ecosia)\.'),
      'traffico_social', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since
        and (utm_medium in ('social', 'paid_social') or utm_source in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube')
          or referrer_host ~ '(^|\.)(instagram|facebook|fb|tiktok|linkedin|lnkd|youtube|t)\.(com|me|co|in)$')),
      'traffico_campagne', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since and utm_campaign is not null),
      'traffico_diretto', (select count(*) from public.analytics_events where event = 'page_view' and is_entry and occurred_at >= _since
        and utm_source is null and referrer_host is null),
      'conversioni', (select count(*) from public.analytics_events where event in ('registrazione', 'candidatura_partner', 'iscrizione_beta', 'richiesta_inviata') and occurred_at >= _since),
      'registrazioni_da_campagne', (select count(*) from public.user_acquisition where created_at >= _since and utm_campaign is not null),
      'spesa_pubblicitaria_cents', _spend,
      'costo_acquisizione_cents', case when coalesce(_spend, 0) > 0 and _paid_signups > 0 then round(_spend::numeric / _paid_signups)::bigint end,
      'referral_registrati', (select count(*) from public.referrals where created_at >= _since),
      'referral_qualificati', (select count(*) from public.referrals where created_at >= _since and status in ('qualificato', 'premiato')),
      'campagne_attive', (select count(*) from public.marketing_campaigns where status in ('approvato', 'pubblicato')
        and (end_on is null or end_on >= current_date))),
    'qualita', jsonb_build_object(
      'segnalazioni_aperte', (select count(*) from public.content_reports where status in ('nuova', 'in_esame')),
      'assistenza_aperta', (select count(*) from public.support_tickets where status not in ('risolta', 'chiusa')),
      'reclami_aperti', (select count(*) from public.support_tickets where category = 'reclamo' and status not in ('risolta', 'chiusa')),
      'recensioni_periodo', (select count(*) from public.reviews where status = 'pubblicata' and created_at >= _since),
      'voto_medio_periodo', (select round(avg(rating)::numeric, 2) from public.reviews where status = 'pubblicata' and created_at >= _since),
      'errori_app_periodo', (select count(*) from public.app_errors where occurred_at >= _since))
  );
end;
$$;
revoke all on function public.admin_launch_kpis(integer) from public, anon;
grant execute on function public.admin_launch_kpis(integer) to authenticated;

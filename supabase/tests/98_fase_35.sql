-- =====================================================================
-- Fase 35 — Supporto clienti (reclami, supporto partner) e cruscotto KPI
-- =====================================================================
\set ON_ERROR_STOP on

-- 1. Reclamo e supporto partner: accettati, avviso specifico allo staff
begin;
select tests.as_user(tests.id('cliente'));
select public.open_support_ticket('reclamo', 'Risposta mai ricevuta', 'Ho scritto a un venditore una settimana fa e non ho ricevuto risposta.');
select public.open_support_ticket('partner', 'Come pubblico le foto', 'Non riesco a caricare le foto della mia officina.');
select tests.expect_error($$select public.open_support_ticket('inventata', 'Prova categoria', 'Categoria che non esiste nel sistema.')$$, 'categoria di assistenza non prevista rifiutata');
reset role;
select tests.expect((select count(*) from public.support_tickets where user_id = tests.id('cliente') and category in ('reclamo', 'partner')) = 2, 'reclamo e supporto partner registrati');
select tests.expect((select count(*) from public.notifications n join public.user_roles r on r.user_id = n.user_id
  where r.role = 'admin' and n.title = 'Nuovo reclamo') >= 1, 'gli amministratori ricevono l''avviso «Nuovo reclamo»');
select tests.expect((select count(*) from public.notifications n join public.user_roles r on r.user_id = n.user_id
  where r.role = 'admin' and n.title = 'Nuova richiesta di supporto partner') >= 1, 'gli amministratori ricevono l''avviso di supporto partner');
select tests.expect((select count(*) from public.notifications where user_id = tests.id('cliente') and title in ('Nuovo reclamo', 'Nuova richiesta di supporto partner')) = 0,
  'chi apre la richiesta non riceve avvisi destinati allo staff');
rollback;

-- 2. Cruscotto di lancio: solo staff, struttura completa, valori da dati reali
begin;
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.admin_launch_kpis(30)$$, 'il cliente non vede i KPI di lancio');
select tests.as_anon();
select tests.expect_error($$select public.admin_launch_kpis(30)$$, 'l''anonimo non vede i KPI di lancio');
select tests.as_user(tests.id('admin'));
select tests.expect((select public.admin_launch_kpis(30) ?& array['marketplace', 'partner', 'clienti', 'marketing', 'qualita']), 'KPI con tutte le sezioni');
select tests.expect((select (public.admin_launch_kpis(30) -> 'marketplace' ->> 'auto_pubblicate_totale')::integer
  = (select count(*) from public.vehicle_listings where status = 'pubblicato')), 'auto pubblicate = conteggio reale degli annunci');
select tests.expect((select (public.admin_launch_kpis(30) -> 'partner' ->> 'verificati')::integer
  = (select count(*) from public.professional_profiles where deleted_at is null and review_status = 'approvato')), 'partner verificati = conteggio reale');
select tests.expect((select public.admin_launch_kpis(30) -> 'marketing' -> 'costo_acquisizione_cents' = 'null'::jsonb
  or (select count(*) from public.ad_budget_entries where actual_cents > 0) > 0), 'costo di acquisizione assente se non c''è spesa registrata');
select tests.expect((select (public.admin_launch_kpis(9999) ->> 'giorni')::integer = 730), 'periodo limitato a 2 anni');
rollback;

select '=== FASE 35 SUPERATA ===';

-- =====================================================================
-- AutoGarage24 — Migrazione 0015 (Fasi 4, 9, 10): segnalazioni,
-- assistenza clienti, CMS, Field Manager, autorizzazioni dei venditori,
-- Controllo AutoGarage24, piani futuri, GDPR e statistiche.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Segnalazioni
-- ---------------------------------------------------------------------
create table public.content_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  target_type   text not null check (target_type in ('annuncio_auto', 'ricambio', 'profilo', 'recensione', 'messaggio', 'utente', 'altro')),
  target_id     uuid,
  target_label  text check (char_length(target_label) <= 200),
  category      text not null check (category in ('annuncio_sospetto', 'profilo_falso', 'foto_non_autorizzate', 'truffa',
                                                  'comportamento_scorretto', 'spam', 'informazioni_ingannevoli', 'contenuto_inappropriato', 'altro')),
  description   text not null check (char_length(description) between 10 and 3000),
  priority      text not null default 'normale' check (priority in ('bassa', 'normale', 'alta', 'urgente')),
  status        text not null default 'nuova' check (status in ('nuova', 'in_esame', 'risolta', 'archiviata')),
  assigned_to   uuid references public.profiles (id) on delete set null,
  resolution    text check (char_length(resolution) <= 2000),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index content_reports_status_idx on public.content_reports (status, priority, created_at);
create trigger content_reports_set_updated_at before update on public.content_reports for each row execute function private.set_updated_at();

create or replace function private.content_reports_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'nuova'; new.assigned_to := null; new.resolution := null; new.resolved_at := null;
  new.priority := case when new.category = 'truffa' then 'alta' else 'normale' end;
  perform private.enforce_rate_limit('report', 10, interval '1 day');
  return new;
end;
$$;
create trigger content_reports_before_insert before insert on public.content_reports for each row execute function private.content_reports_before_insert();

-- Nessuna sospensione automatica: la decisione è sempre di una persona dello staff.
create or replace function public.admin_update_report(report_id uuid, new_status text, new_priority text default null,
                                                      resolution_text text default null, assign_to_me boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('reports.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if new_status in ('risolta', 'archiviata') and coalesce(trim(resolution_text), '') = '' then
    raise exception 'Descrivi la decisione presa' using errcode = '22023';
  end if;
  update public.content_reports
     set status = new_status, priority = coalesce(new_priority, priority), resolution = coalesce(resolution_text, resolution),
         assigned_to = case when assign_to_me then auth.uid() else assigned_to end,
         resolved_at = case when new_status in ('risolta', 'archiviata') then now() else null end
   where id = report_id;
  perform private.log_admin_action('report.' || new_status, 'content_reports', report_id::text,
    jsonb_build_object('priority', new_priority, 'resolution', resolution_text));
end;
$$;

-- ---------------------------------------------------------------------
-- Assistenza clienti (ticket + conversazione con lo staff)
-- ---------------------------------------------------------------------
create table public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  category         text not null check (category in ('account', 'annunci', 'acquisto_vendita', 'officine', 'meccanici', 'ricambi',
                                                     'funzionamento', 'privacy', 'segnalazioni', 'altro')),
  subject          text not null check (char_length(subject) between 3 and 160),
  status           text not null default 'nuova' check (status in ('nuova', 'aperta', 'in_lavorazione', 'in_attesa_utente', 'risolta', 'chiusa')),
  assigned_to      uuid references public.profiles (id) on delete set null,
  conversation_id  uuid references public.conversations (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index support_tickets_status_idx on public.support_tickets (status, created_at);
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function private.set_updated_at();

create or replace function public.open_support_ticket(category text, subject text, message text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _id uuid; _conv uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if char_length(coalesce(trim(message), '')) < 10 then raise exception 'Descrivi il problema (almeno 10 caratteri)' using errcode = '22023'; end if;
  perform private.enforce_rate_limit('support_ticket', 5, interval '1 day');
  insert into public.conversations (context, subject, created_by) values ('supporto', 'Assistenza: ' || subject, auth.uid())
  returning id into _conv;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at) values (_conv, auth.uid(), now());
  insert into public.support_tickets (user_id, category, subject, conversation_id) values (auth.uid(), category, subject, _conv)
  returning id into _id;
  insert into public.messages (conversation_id, sender_id, body) values (_conv, auth.uid(), message);
  return _id;
end;
$$;

-- Lo staff prende in carico: entra nella conversazione del ticket (tracciato).
create or replace function public.admin_update_ticket(ticket_id uuid, new_status text, assign_to_me boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
declare _t public.support_tickets%rowtype;
begin
  if not private.has_permission('support.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  select * into _t from public.support_tickets where id = ticket_id for update;
  if not found then raise exception 'Ticket non trovato' using errcode = 'P0002'; end if;
  update public.support_tickets set status = new_status,
         assigned_to = case when assign_to_me then auth.uid() else assigned_to end where id = ticket_id;
  if assign_to_me and _t.conversation_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role, last_read_at)
    values (_t.conversation_id, auth.uid(), 'staff', now()) on conflict do nothing;
  end if;
  perform private.notify(_t.user_id, 'account', 'Richiesta di assistenza: ' || replace(new_status, '_', ' '), _t.subject,
    '/dashboard/supporto', 'ticket:' || ticket_id || ':' || new_status, 'assistenza_aggiornata');
  perform private.log_admin_action('support.' || new_status, 'support_tickets', ticket_id::text, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- CMS: contenuti testuali con bozza, pubblicazione e storico.
-- Solo testo semplice: l'interfaccia non interpreta mai HTML o script.
-- ---------------------------------------------------------------------
create table public.site_content (
  key           text primary key check (key ~ '^[a-z0-9_.]+$'),
  label         text not null,
  draft         jsonb,
  published     jsonb,
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  published_by  uuid references public.profiles (id) on delete set null,
  published_at  timestamptz
);
create table public.site_content_history (
  id          bigint generated always as identity primary key,
  key         text not null references public.site_content (key) on delete cascade,
  action      text not null check (action in ('bozza', 'pubblicazione', 'ritiro')),
  content     jsonb,
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create or replace function private.validate_content(_c jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  -- Oggetto piatto di stringhe brevi, senza tag HTML.
  select jsonb_typeof(_c) = 'object'
     and not exists (select 1 from jsonb_each(_c) e where jsonb_typeof(e.value) <> 'string'
                     or char_length(e.value #>> '{}') > 2000 or (e.value #>> '{}') ~ '<[a-zA-Z/!]');
$$;

create or replace function public.admin_save_content(content_key text, content jsonb, publish boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('content.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if not private.validate_content(content) then
    raise exception 'Contenuto non valido: sono ammessi solo testi semplici (niente HTML), max 2000 caratteri per campo' using errcode = '22023';
  end if;
  update public.site_content set draft = content, updated_by = auth.uid(), updated_at = now() where key = content_key;
  if not found then raise exception 'Contenuto non trovato' using errcode = 'P0002'; end if;
  insert into public.site_content_history (key, action, content, actor_id) values (content_key, 'bozza', content, auth.uid());
  if publish then
    update public.site_content set published = draft, published_by = auth.uid(), published_at = now() where key = content_key;
    insert into public.site_content_history (key, action, content, actor_id) values (content_key, 'pubblicazione', content, auth.uid());
  end if;
  perform private.log_admin_action(case when publish then 'content.published' else 'content.saved' end, 'site_content', content_key, '{}'::jsonb);
end;
$$;

create or replace function public.admin_unpublish_content(content_key text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('content.manage') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  update public.site_content set published = null, published_by = auth.uid(), published_at = now() where key = content_key;
  insert into public.site_content_history (key, action, actor_id) values (content_key, 'ritiro', auth.uid());
  perform private.log_admin_action('content.unpublished', 'site_content', content_key, '{}'::jsonb);
end;
$$;

insert into public.site_content (key, label) values
  ('home.hero', 'Homepage — sezione principale'),
  ('home.neopatentati', 'Homepage — AutoGarage24 Neopatentati'),
  ('home.announcement', 'Avviso importante in homepage'),
  ('site.contacts', 'Contatti e informazioni aziendali'),
  ('faq.neopatentati', 'FAQ Neopatentati'),
  ('faq.garages', 'FAQ Officine'),
  ('faq.meccanici', 'FAQ Meccanici'),
  ('faq.ricambi', 'FAQ Ricambi');

-- ---------------------------------------------------------------------
-- Field Manager: contatti, visite, autorizzazioni dei venditori
-- ---------------------------------------------------------------------
create table public.field_contacts (
  id                       uuid primary key default gen_random_uuid(),
  business_name            text not null check (char_length(business_name) between 2 and 160),
  contact_name             text check (char_length(contact_name) <= 120),
  phone                    text check (char_length(phone) <= 30),
  email                    text check (char_length(email) <= 254),
  address                  text check (char_length(address) <= 200),
  city                     text check (char_length(city) <= 80),
  business_type            text not null check (business_type in ('officina', 'concessionario', 'venditore_auto', 'meccanico',
                                                                   'venditore_ricambi', 'altro')),
  status                   text not null default 'da_contattare' check (status in ('da_contattare', 'contattato', 'visita_programmata',
                             'visitato', 'interessato', 'collaborazione_attiva', 'non_interessato')),
  notes                    text check (char_length(notes) <= 4000),
  next_followup_on         date,
  professional_profile_id  uuid references public.professional_profiles (id) on delete set null,
  created_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index field_contacts_status_idx on public.field_contacts (status, next_followup_on);
create trigger field_contacts_set_updated_at before update on public.field_contacts for each row execute function private.set_updated_at();

create table public.field_visits (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.field_contacts (id) on delete cascade,
  visited_on   date not null default current_date,
  kind         text not null default 'visita' check (kind in ('visita', 'telefonata', 'email', 'appuntamento', 'nota')),
  notes        text check (char_length(notes) <= 4000),
  outcome      text check (char_length(outcome) <= 500),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index field_visits_contact_idx on public.field_visits (contact_id, visited_on desc);

alter table public.vehicle_listings add column field_contact_id uuid references public.field_contacts (id) on delete set null;

create table public.seller_authorizations (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null references public.vehicle_listings (id) on delete cascade,
  contact_id           uuid references public.field_contacts (id) on delete set null,
  authorized_by_name   text not null check (char_length(authorized_by_name) between 2 and 160),
  authorized_on        date not null,
  method               text not null check (method in ('modulo_firmato', 'email', 'messaggio_scritto', 'altro_documentato')),
  scope                text not null check (char_length(scope) between 3 and 1000),
  listing_authorized   boolean not null default false,
  photos_authorized    boolean not null default false,
  price_confirmed      boolean not null default false,
  availability_confirmed boolean not null default false,
  document_path        text check (char_length(document_path) <= 400),
  revoked_at           timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now()
);
create index seller_authorizations_listing_idx on public.seller_authorizations (listing_id);

-- ---------------------------------------------------------------------
-- Controllo AutoGarage24: controlli realmente eseguiti, datati e attribuiti
-- ---------------------------------------------------------------------
create type public.inspection_result as enum ('controllato', 'da_monitorare', 'riparazione_consigliata', 'non_controllato', 'non_applicabile');

create table public.vehicle_inspections (
  id                      uuid primary key default gen_random_uuid(),
  listing_id              uuid not null references public.vehicle_listings (id) on delete cascade,
  inspector_name          text not null check (char_length(inspector_name) between 2 and 160),
  inspector_profile_id    uuid references public.professional_profiles (id) on delete set null,
  garage_profile_id       uuid references public.professional_profiles (id) on delete set null,
  inspected_on            date not null,
  mileage_km              integer check (mileage_km between 0 and 2000000),
  mileage_source          text not null default 'rilevato' check (mileage_source in ('dichiarato', 'rilevato')),
  observations            text check (char_length(observations) <= 4000),
  recommendations         text check (char_length(recommendations) <= 4000),
  recommended_repairs     text check (char_length(recommended_repairs) <= 4000),
  status                  text not null default 'bozza' check (status in ('bozza', 'pubblicato', 'ritirato')),
  created_by              uuid references public.profiles (id) on delete set null,
  published_by            uuid references public.profiles (id) on delete set null,
  published_at            timestamptz,
  created_at              timestamptz not null default now()
);
create table public.inspection_items (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references public.vehicle_inspections (id) on delete cascade,
  item           text not null check (char_length(item) between 2 and 120),
  result         public.inspection_result not null,
  note           text check (char_length(note) <= 500),
  position       integer not null default 0
);
create table public.inspection_photos (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references public.vehicle_inspections (id) on delete cascade,
  storage_path   text not null unique check (char_length(storage_path) <= 400),
  caption        text check (char_length(caption) <= 200)
);

create or replace function public.admin_publish_inspection(inspection_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('listings.moderate') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  if not exists (select 1 from public.inspection_items where inspection_items.inspection_id = admin_publish_inspection.inspection_id) then
    raise exception 'Aggiungi almeno un elemento controllato' using errcode = '22023';
  end if;
  update public.vehicle_inspections set status = 'pubblicato', published_by = auth.uid(), published_at = now() where id = inspection_id;
  perform private.log_admin_action('inspection.published', 'vehicle_inspections', inspection_id::text, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- Piani commerciali futuri: solo struttura, nessun pagamento attivo.
-- ---------------------------------------------------------------------
create table public.subscription_plans (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z0-9_]+$'),
  name         text not null,
  audience     text not null check (audience in ('officina', 'meccanico', 'venditore_auto', 'venditore_ricambi', 'tutti')),
  features     jsonb not null default '[]'::jsonb,
  price_note   text,
  active       boolean not null default false,
  created_at   timestamptz not null default now()
);
comment on table public.subscription_plans is 'Struttura predisposta. Nessun piano a pagamento è attivo: richiede approvazione del fondatore.';

-- ---------------------------------------------------------------------
-- GDPR: richieste di cancellazione ed esportazione dei propri dati
-- ---------------------------------------------------------------------
create table public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  reason        text check (char_length(reason) <= 1000),
  status        text not null default 'ricevuta' check (status in ('ricevuta', 'in_lavorazione', 'completata', 'respinta')),
  staff_note    text check (char_length(staff_note) <= 1000),
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  processed_by  uuid references public.profiles (id) on delete set null
);
create unique index account_deletion_open_idx on public.account_deletion_requests (user_id) where status in ('ricevuta', 'in_lavorazione');

create or replace function public.export_my_data()
returns jsonb language plpgsql stable security invoker set search_path = ''
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
    'assistenza', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.support_tickets t where t.user_id = _uid)
  );
end;
$$;

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
    -- Disattiva e pseudonimizza il profilo; i dati da conservare per obblighi legali restano (vedi docs/SECURITY.md).
    update public.profiles set account_status = 'disattivato', deleted_at = now(), full_name = null, phone = null, city = null,
           postal_code = null, avatar_path = null, marketing_consent = false
     where id = _req.user_id;
    update public.professional_profiles set is_published = false, deleted_at = now() where user_id = _req.user_id;
    update public.vehicle_listings set status = 'sospeso', status_note = 'Account eliminato'
     where owner_id = _req.user_id and status in ('pubblicato', 'approvato', 'in_revisione');
    delete from public.user_vehicles where owner_id = _req.user_id;
    delete from public.driver_profiles where user_id = _req.user_id;
  end if;
  perform private.log_admin_action('gdpr.deletion_' || decision, 'account_deletion_requests', request_id::text, jsonb_build_object('note', note));
end;
$$;

-- ---------------------------------------------------------------------
-- Statistiche reali per il pannello
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_stats(days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _since timestamptz := now() - make_interval(days => least(greatest(days, 1), 365));
begin
  if not private.has_permission('stats.view') then raise exception 'Operazione non autorizzata' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where deleted_at is null),
    'users_new', (select count(*) from public.profiles where created_at >= _since),
    'roles', (select jsonb_object_agg(role, n) from (select role, count(*) n from public.user_roles group by role) x),
    'listings_published', (select count(*) from public.vehicle_listings where status = 'pubblicato'),
    'listings_pending', (select count(*) from public.vehicle_listings where status = 'in_revisione'),
    'parts_published', (select count(*) from public.part_listings where status = 'pubblicato'),
    'parts_pending', (select count(*) from public.part_listings where status = 'in_revisione'),
    'profiles_pending', (select count(*) from public.professional_profiles where review_status in ('inviato', 'in_verifica')),
    'verifications_pending', (select count(*) from public.verification_requests where status in ('in_attesa', 'in_revisione')),
    'requests_period', (select count(*) from public.requests where created_at >= _since),
    'quotes_period', (select count(*) from public.quotes where created_at >= _since),
    'appointments_confirmed_period', (select count(*) from public.appointments where status = 'confermato' and decided_at >= _since),
    'tickets_open', (select count(*) from public.support_tickets where status not in ('risolta', 'chiusa')),
    'reports_open', (select count(*) from public.content_reports where status in ('nuova', 'in_esame')),
    'reviews_published', (select count(*) from public.reviews where status = 'pubblicata'),
    'emails_failed', (select count(*) from public.email_outbox where status = 'errore'),
    'emails_queued', (select count(*) from public.email_outbox where status = 'in_coda'),
    'deletion_requests_open', (select count(*) from public.account_deletion_requests where status in ('ricevuta', 'in_lavorazione')),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date,
                'users', (select count(*) from public.profiles p where p.created_at::date = d::date),
                'requests', (select count(*) from public.requests r where r.created_at::date = d::date),
                'listings', (select count(*) from public.vehicle_listings l where l.published_at::date = d::date)) order by d), '[]')
              from generate_series(_since::date, current_date, interval '1 day') d)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.content_reports enable row level security;
alter table public.support_tickets enable row level security;
alter table public.site_content enable row level security;
alter table public.site_content_history enable row level security;
alter table public.field_contacts enable row level security;
alter table public.field_visits enable row level security;
alter table public.seller_authorizations enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.account_deletion_requests enable row level security;

revoke all on table public.content_reports, public.support_tickets, public.site_content, public.site_content_history,
  public.field_contacts, public.field_visits, public.seller_authorizations, public.vehicle_inspections, public.inspection_items,
  public.inspection_photos, public.subscription_plans, public.account_deletion_requests from anon, authenticated;
grant all on table public.content_reports, public.support_tickets, public.site_content, public.site_content_history,
  public.field_contacts, public.field_visits, public.seller_authorizations, public.vehicle_inspections, public.inspection_items,
  public.inspection_photos, public.subscription_plans, public.account_deletion_requests to service_role;

grant select, insert on table public.content_reports to authenticated;
create policy "reports: segnalante" on public.content_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "reports: staff" on public.content_reports for select to authenticated using ((select private.has_permission('reports.manage')));
create policy "reports: creazione" on public.content_reports for insert to authenticated with check (reporter_id = (select auth.uid()));

grant select on table public.support_tickets to authenticated;
create policy "tickets: titolare" on public.support_tickets for select to authenticated using (user_id = (select auth.uid()));
create policy "tickets: staff" on public.support_tickets for select to authenticated using ((select private.has_permission('support.manage')));

grant select on table public.site_content to anon, authenticated;
create policy "site_content: pubblicato visibile a tutti" on public.site_content for select to anon, authenticated using (true);
grant select on table public.site_content_history to authenticated;
create policy "site_content_history: gestori" on public.site_content_history for select to authenticated
  using ((select private.has_permission('content.manage')));

grant select, insert, update, delete on table public.field_contacts, public.field_visits, public.seller_authorizations to authenticated;
create policy "field_contacts: field manager" on public.field_contacts for all to authenticated
  using ((select private.has_permission('field.manage'))) with check ((select private.has_permission('field.manage')));
create policy "field_visits: field manager" on public.field_visits for all to authenticated
  using ((select private.has_permission('field.manage'))) with check ((select private.has_permission('field.manage')));
create policy "seller_authorizations: field manager" on public.seller_authorizations for all to authenticated
  using ((select private.has_permission('field.manage'))) with check ((select private.has_permission('field.manage')));
create policy "seller_authorizations: staff moderazione" on public.seller_authorizations for select to authenticated
  using ((select private.has_permission('listings.moderate')));

grant select on table public.vehicle_inspections, public.inspection_items, public.inspection_photos to anon, authenticated;
grant insert, update, delete on table public.vehicle_inspections, public.inspection_items, public.inspection_photos to authenticated;
create policy "inspections: pubbliche se pubblicate" on public.vehicle_inspections for select to anon, authenticated
  using (status = 'pubblicato' and private.listing_is_public(listing_id));
create policy "inspections: staff" on public.vehicle_inspections for all to authenticated
  using ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')))
  with check (((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage'))) and status <> 'pubblicato');
create policy "inspection_items: pubblici" on public.inspection_items for select to anon, authenticated
  using (exists (select 1 from public.vehicle_inspections i where i.id = inspection_id and i.status = 'pubblicato'));
create policy "inspection_items: staff" on public.inspection_items for all to authenticated
  using ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')))
  with check ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')));
create policy "inspection_photos: pubbliche" on public.inspection_photos for select to anon, authenticated
  using (exists (select 1 from public.vehicle_inspections i where i.id = inspection_id and i.status = 'pubblicato'));
create policy "inspection_photos: staff" on public.inspection_photos for all to authenticated
  using ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')))
  with check ((select private.has_permission('listings.moderate')) or (select private.has_permission('field.manage')));

grant select on table public.subscription_plans to authenticated;
grant insert, update on table public.subscription_plans to authenticated;
create policy "plans: gestione" on public.subscription_plans for all to authenticated
  using ((select private.has_permission('plans.manage'))) with check ((select private.has_permission('plans.manage')) and not active);

grant select, insert on table public.account_deletion_requests to authenticated;
create policy "deletion: titolare" on public.account_deletion_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "deletion: staff" on public.account_deletion_requests for select to authenticated using ((select private.has_permission('gdpr.manage')));
create policy "deletion: creazione" on public.account_deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'ricevuta');

revoke all on function public.admin_update_report(uuid, text, text, text, boolean), public.open_support_ticket(text, text, text),
  public.admin_update_ticket(uuid, text, boolean), public.admin_save_content(text, jsonb, boolean), public.admin_unpublish_content(text),
  public.admin_publish_inspection(uuid), public.export_my_data(), public.admin_process_deletion(uuid, text, text),
  public.admin_dashboard_stats(integer) from public, anon;
grant execute on function public.admin_update_report(uuid, text, text, text, boolean), public.open_support_ticket(text, text, text),
  public.admin_update_ticket(uuid, text, boolean), public.admin_save_content(text, jsonb, boolean), public.admin_unpublish_content(text),
  public.admin_publish_inspection(uuid), public.export_my_data(), public.admin_process_deletion(uuid, text, text),
  public.admin_dashboard_stats(integer) to authenticated;

-- Documenti di autorizzazione del Field Manager: bucket privato
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('field-documents', 'field-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;
create policy "field-documents: field manager" on storage.objects for all to authenticated
  using (bucket_id = 'field-documents' and (select private.has_permission('field.manage')))
  with check (bucket_id = 'field-documents' and (select private.has_permission('field.manage')));

# Database

PostgreSQL gestito da Supabase. Lo schema è descritto dalle migrazioni in `supabase/migrations/`, applicate in ordine. Questo documento copre la **Fase 1**; ogni fase successiva aggiungerà le proprie tabelle (veicoli, annunci, richieste, messaggi, ecc.) seguendo lo stesso schema.

## Tabelle della Fase 1

| Tabella | Contenuto | Chi può leggere | Chi può modificare |
|---|---|---|---|
| `profiles` | Dati personali di ogni account | Titolare, amministratori | Titolare (solo nome, telefono, città, CAP, avatar, lingua, consenso marketing) |
| `user_roles` | Ruoli assegnati | Titolare, amministratori | Solo funzioni amministrative |
| `professional_profiles` | Vetrina pubblica del professionista | Tutti, se pubblicato e account attivo; titolare; amministratori | Titolare (campi descrittivi); badge solo amministratori |
| `business_profiles` | Dati legali/fiscali (P.IVA, PEC, SDI) | Titolare, amministratori | Titolare |
| `verification_requests` | Richieste di verifica | Titolare, amministratori | Titolare crea; esito solo amministratori |
| `verification_documents` | Documenti allegati alle richieste | Titolare, amministratori | Titolare finché la richiesta è aperta |
| `admin_audit_logs` | Registro operazioni amministrative | Amministratori | Nessuno: solo aggiunta, mai modifica né cancellazione |

## Relazioni

```
auth.users 1─1 profiles 1─N user_roles
                  │
                  ├─1─1 professional_profiles   (solo account professionali)
                  ├─1─1 business_profiles
                  └─1─N verification_requests 1─N verification_documents
admin_audit_logs.actor_id ─► profiles
```

Tutte le chiavi esterne verso `profiles` usano `on delete cascade`: cancellando un account si cancellano i dati collegati (diritto all'oblio). L'audit log conserva la riga impostando l'autore a `null`.

## Tipi enumerati

- `app_role`: cliente, officina, meccanico, venditore_auto, venditore_ricambi, admin
- `account_status`: attivo, sospeso, disattivato
- `verification_type` (= badge): identita, attivita_professionale, documentazione
- `verification_status`: in_attesa, in_revisione, approvata, rifiutata, annullata

## Automatismi

- **Alla registrazione** (`private.handle_new_user`): crea profilo e ruolo. Il ruolo richiesto viene accettato solo se non è `admin`. Per i professionisti crea il profilo pubblico (non pubblicato) con uno slug leggibile, es. `officina-rossi-figli-1a2b3c4d`.
- **Cambio email** in Auth: aggiorna `profiles.email`.
- **Consenso marketing**: la data viene registrata automaticamente quando cambia.
- **`updated_at`**: aggiornato automaticamente a ogni modifica.

## Funzioni amministrative (RPC)

Tutte verificano che chi chiama sia un amministratore attivo e scrivono l'audit log.

| Funzione | Effetto |
|---|---|
| `admin_set_account_status(utente, stato, motivo)` | Sospende/riattiva un account (non il proprio) |
| `admin_grant_role` / `admin_revoke_role` | Assegna/revoca ruoli; revocando un ruolo professionale il profilo pubblico viene nascosto |
| `admin_review_verification(richiesta, esito, nota)` | Esamina una verifica; l'approvazione attiva il badge corrispondente; il rifiuto richiede una motivazione |
| `admin_clear_badge(utente, badge, motivo)` | Revoca un badge |
| `bootstrap_first_admin(email)` | Solo con chiave segreta e solo se non esistono amministratori |

## Storage

| Bucket | Visibilità | Limiti | Regola |
|---|---|---|---|
| `avatars` | Pubblico | 2 MB, JPEG/PNG/WebP | Ognuno scrive solo nella cartella `<proprio id>/` |
| `verification-documents` | **Privato** | 10 MB, PDF/JPEG/PNG/WebP | Lettura solo titolare e amministratori |

## Convenzioni per le prossime migrazioni

- Un file per argomento, nome `AAAAMMGGhhmmss_descrizione.sql`; mai modificare migrazioni già applicate in produzione.
- `enable row level security` + `revoke all` + grant espliciti per ogni nuova tabella.
- Policy separate per ruolo, con `(select auth.uid())` per le prestazioni.
- Aggiungere i relativi controlli in `supabase/tests/` ed eseguire `npm run test:db`.

---

## Fasi 3–10 (migrazioni 0007–0016)

Totale: **16 migrazioni**, circa 70 tabelle, 153 regole di accesso (policy RLS), oltre 110 funzioni. RLS è attivo su **tutte** le tabelle dello schema `public`. Le funzioni privilegiate (SECURITY DEFINER) stanno nello schema `private`, non esposto, oppure in `public` con controllo esplicito di `auth.uid()` e dei permessi.

| Migrazione | Tabelle principali | Note |
|---|---|---|
| 0007 rbac | role_permissions | Permessi per ruolo (`has_permission`), usati dal pannello |
| 0008 professionals_extended | business_categories, professional_services, business_photos, professional_affiliations, professional_certifications | Certificazioni visibili solo dopo verifica |
| 0009 vehicle_marketplace | vehicles, vehicle_listings, vehicle_images, vehicle_listing_status_history | Stati: bozza → in_revisione → approvato/pubblicato → venduto/scaduto/sospeso; storico immutabile |
| 0010 neopatentati | legal_rules, legal_rule_versions, vehicle_compatibility_checks, driver_profiles | Regole versionate con fonti; `private.evaluate_neo` |
| 0011 requests_messaging | requests, request_events, quotes, appointments, conversations, conversation_participants, messages, user_blocks, notifications, notification_preferences, email_outbox, activity_events | Realtime su messaggi e notifiche; rate limit |
| 0012 favorites_reviews | favorites, reviews, review_reports | Recensione solo dopo una richiesta completata (una per richiesta) |
| 0013 parts_marketplace | part_categories, part_listings, part_images, part_compatibility | Base di compatibilità dichiarata |
| 0014 garage_maintenance | user_vehicles, mileage_logs, maintenance_records, work_reports, user_vehicle_documents, maintenance_reminders, vehicle_expenses | Interventi del professionista solo se confermati dal proprietario |
| 0015 admin_operations | content_reports, support_tickets, site_content(+history), field_contacts, field_visits, seller_authorizations, vehicle_inspections, inspection_items, inspection_photos, subscription_plans, account_deletion_requests | Piani sempre `active = false` |
| 0016 listing_search_neo | — | Vista di ricerca con esito neopatentati; reset dei campi di sistema; mascheramento della posizione dei professionisti; `search_parts`; bozze CMS private |

### Funzioni pubbliche principali (RPC)
`search_professionals`, `search_parts`, `professional_locations`, `professional_private_details`, `counterpart_names`, `become_professional`, `submit_professional_profile`, `send_quote`, `propose_appointment`, `export_my_data`, `admin_content_list` e le funzioni `admin_*` (tutte con controllo di permesso e scrittura nel registro attività).

### Job pianificati (pg_cron, se attivo)
- `ag24-promemoria-giornalieri`: genera le notifiche dei promemoria di manutenzione in scadenza.
- `ag24-annunci-scaduti`: segna come scaduti gli annunci oltre la data di scadenza.

### Stato sul progetto Supabase reale
Applicate: 0001, 0002, 0003, 0005, 0006. **Da applicare: 0004, 0007–0016** (in attesa di conferma).

---

## Fasi 11–20 (migrazioni 0017–0018)
Totale **18 migrazioni**. Dettaglio di tabelle e funzioni in [REPORT_FASI_11_20.md](REPORT_FASI_11_20.md) §3.
- 0017: candidature partner, iscrizioni Beta, Founding Partners, CRM esteso (storico immutabile), marketing (campagne, contenuti, esperimenti, budget, storico stati), analytics senza dati personali (conservazione 25 mesi), notifiche allo staff, modifica/rimozione annunci, statistiche di crescita.
- 0018: richieste di intervento multi-officina (`repair_requests` + `requests.repair_request_id`), preventivi dettagliati, riprogrammazione appuntamenti, verifiche e storico recensioni, reputazione, mappa (`map_search`), officine contattate per veicolo, iscrizioni push, approvazione spese solo del fondatore.
- Sul progetto reale: **da applicare 0004 e 0007–0018**.

---

## Fasi 21–30 (migrazioni 0019–0023)
Totale **23 migrazioni**. Dettaglio in [REPORT_FASI_21_30.md](REPORT_FASI_21_30.md) §2–§11.
- 0019: ruoli `soccorritore`, `trasportatore`, `centro_revisione`, `intermediario_assicurativo` (quest'ultimo solo su abilitazione dello staff).
- 0020: `platform_settings`; offerte e coupon (`promotional_offers`, `offer_status_history`, `promotional_coupons`, `offer_claims`, `coupon_redemptions`); `vehicle_videos`, `vehicle_verifications`, `vehicle_price_history`; prenotazioni (`booking_settings`, `booking_availability`, `booking_blocks`, `vehicle_bookings`, `vehicle_booking_events`, `calendar_connections`).
- 0021: soccorso (`roadside_operators`, `roadside_requests`, `roadside_request_locations`, `roadside_targets`, `roadside_quotes`, `roadside_events`, `roadside_live_locations`); trasporti (`transport_operators`, `transport_requests`, `transport_request_addresses`, `transport_quotes`, `transport_reports`, `transport_events`); bucket `service-photos`.
- 0022: assicurazioni (`insurance_partners`, `insurance_partner_users`, `insurance_integrations`, `insurance_quote_requests`, `insurance_request_partners`, `insurance_quotes`, `insurance_request_events`); revisioni (`inspection_centers`, `inspection_authorizations`, `inspection_appointments`, `inspection_records`, colonne `user_vehicles.inspection_category` e `usage_type`, regole `inspection_rules`); valutazioni (`vehicle_valuations`, `valuation_requests`, `valuation_request_targets`, `valuation_offers`, `negotiation_events`, `trade_in_proposals`, bucket `valuation-photos`); `private.history_immutable` (cronologie cancellabili solo a cascata).
- 0023: Business Center (`daily_view_counts`, `plan_limits`, `business_plan_assignments`, `business_members`, `business_audit`, `business_lead_states`, `business_lead_notes`, `business_tasks`).

### Nuovi job pianificati (pg_cron, se attivo)
`ag24-promemoria-prenotazioni` (15 min), `ag24-offerte-scadute` (giornaliero), `ag24-roadside-housekeeping` (15 min), `ag24-inspection-reminders` (30 min), `ag24-business-tasks` (15 min).

### Stato sul progetto Supabase reale
**Da applicare: 0004 e 0007–0023.**

## Fasi 31–34 (migrazioni 0024–0028)
| Migrazione | Tabelle | Funzioni principali |
|---|---|---|
| 0024 | — (categorie di notifica `premi`, `promozioni`) | — |
| 0025 Rewards | `reward_rules`, `reward_tiers`, `points_ledger`, `rewards_wallets`, `reward_items`, `reward_redemptions`, `referral_codes`, `referrals`; `promotional_coupons` + `assigned_user_id`, `reward_redemption_id` | `rewards_wallet`, `redeem_reward`, `verify_reward_code`, `use_reward_code`, `cancel_reward_redemption`, `my_referral_code`, `admin_adjust_points`, `admin_revoke_points`, `admin_review_reward_item`, `admin_review_referral`, `admin_rewards_stats`; job `expire_points` |
| 0026 Growth | `user_acquisition`, `landing_pages`, `marketing_consent_log`, `email_unsubscribe_tokens`, `marketing_messages`, `marketing_sends`, `marketing_workflows`; `marketing_campaigns` + `target`, `promo_code` | `admin_growth_center`, `admin_landing_results`, `admin_marketing_audience`, `admin_approve_marketing_message`, `admin_send_marketing_message`, `marketing_unsubscribe`; `track_event` esteso; job `run_marketing_workflows` |
| 0027 SEO | `blog_categories`, `blog_articles`, `seo_overrides`, `seo_redirects`; bucket `blog-images` | `seo_local_pages`, `seo_neo_bands`, `admin_seo_checks` |
| 0028 Audit | `app_errors`; 34 indici | `export_my_data` e `admin_process_deletion` estesi, `report_client_error`, `health_check`; job `purge_app_errors` |
| 0029 Pulizia privilegi | — (rimosso l'indice duplicato `favorites_user_part_uniq`) | Solo SELECT su `listing_search`/`part_search`; `listing_favorite_count` e `valuation_professionals` non più eseguibili da anonimi |
| 0030 Lancio: assistenza e indicatori | — (categorie `reclamo` e `partner` nei ticket) | Avvisi allo staff per reclami e supporto partner; `admin_launch_kpis(days)` riservata a `analytics.view`/`stats.view` — **in attesa di approvazione per il progetto reale** |

Impostazioni nuove (`platform_settings`): `rewards_enabled` (false), `rewards_expiry_months` (24), `rewards_tier_window_months` (12), `referral_monthly_limit` (20), `marketing_email_min_days` (7), `marketing_workflows_enabled` (false), `seo_local_min_profiles` (3), `seo_neo_min_listings` (6), `seo_robots_extra_disallow` ([]).

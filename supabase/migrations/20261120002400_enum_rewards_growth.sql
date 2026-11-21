-- =====================================================================
-- Migrazione 0024 — Nuove categorie di notifica (Fasi 31–32).
-- In una migrazione separata: un valore enum nuovo non è utilizzabile
-- nella stessa transazione in cui viene aggiunto.
--   premi       → Rewards: punti, riscatti, livelli (comunicazioni del servizio)
--   promozioni  → comunicazioni promozionali (solo con consenso marketing)
-- =====================================================================
alter type public.notification_category add value if not exists 'premi';
alter type public.notification_category add value if not exists 'promozioni';

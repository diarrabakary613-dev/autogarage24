-- =====================================================================
-- AutoGarage24 — Migrazione 0006 (Fase 10): nuovi ruoli di staff.
-- Separata dalle altre: i nuovi valori di un enum non sono utilizzabili
-- nella stessa transazione in cui vengono aggiunti.
-- =====================================================================
alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'moderatore';
alter type public.app_role add value if not exists 'operatore_assistenza';

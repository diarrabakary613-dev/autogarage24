-- =====================================================================
-- AutoGarage24 — Migrazione 0019 (Fasi 23, 25, 28, 24)
-- Nuovi ruoli professionali. In un file a parte: i nuovi valori di un enum
-- non possono essere usati nella stessa transazione in cui vengono aggiunti.
-- =====================================================================
alter type public.app_role add value if not exists 'soccorritore';
alter type public.app_role add value if not exists 'trasportatore';
alter type public.app_role add value if not exists 'centro_revisione';
-- Assegnabile solo dallo staff dopo la verifica dell'iscrizione al RUI (IVASS).
alter type public.app_role add value if not exists 'intermediario_assicurativo';

-- =====================================================================
-- AutoGarage24 — Migrazione 0001: fondamenta
-- Schema privato per funzioni interne, tipi enumerati, trigger comuni.
-- =====================================================================

-- Schema NON esposto dalle API: contiene funzioni di supporto.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tipi enumerati
-- ---------------------------------------------------------------------

-- Ruoli applicativi. "admin" non è mai auto-assegnabile.
create type public.app_role as enum (
  'cliente',
  'officina',
  'meccanico',
  'venditore_auto',
  'venditore_ricambi',
  'admin'
);

-- Stato dell'account (gestito solo dagli amministratori).
create type public.account_status as enum (
  'attivo',
  'sospeso',
  'disattivato'
);

-- Tipi di verifica: ciascuno corrisponde a un badge distinto.
create type public.verification_type as enum (
  'identita',                -- Identità verificata
  'attivita_professionale',  -- Attività professionale verificata
  'documentazione'           -- Documentazione controllata
);

create type public.verification_status as enum (
  'in_attesa',
  'in_revisione',
  'approvata',
  'rifiutata',
  'annullata'
);

-- ---------------------------------------------------------------------
-- Trigger generico per updated_at
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

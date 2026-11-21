-- ---------------------------------------------------------------------
-- 0029 — Pulizia dei privilegi e degli indici (verifica post-applicazione
-- del 20/11/2026, AUDIT_FASE_34 §16.1).
--
-- Sul progetto Supabase reale i "privilegi predefiniti" assegnano in
-- automatico ad anon e authenticated tutti i permessi sulle nuove viste e
-- EXECUTE sulle nuove funzioni dello schema public. Le migrazioni revocano
-- esplicitamente questi permessi quasi ovunque; restano tre casi:
--  1. le viste listing_search e part_search hanno anche INSERT, UPDATE,
--     DELETE, TRUNCATE, REFERENCES e TRIGGER (oggi senza effetto: le viste
--     non sono aggiornabili e usano security_invoker; li togliamo per
--     principio del minimo privilegio);
--  2. listing_favorite_count e valuation_professionals sono eseguibili da
--     anon (per un anonimo restituiscono 0 righe, ma non servono);
--  3. l'indice favorites_user_part_uniq duplica favorites_part_uq.
-- Nessun dato viene modificato.
-- ---------------------------------------------------------------------

revoke all on table public.listing_search, public.part_search from anon, authenticated;
grant select on table public.listing_search, public.part_search to anon, authenticated;

revoke all on function public.listing_favorite_count(uuid) from public, anon;
grant execute on function public.listing_favorite_count(uuid) to authenticated;

revoke all on function public.valuation_professionals(text, integer) from public, anon;
grant execute on function public.valuation_professionals(text, integer) to authenticated;

drop index if exists public.favorites_user_part_uniq;

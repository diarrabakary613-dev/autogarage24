-- =====================================================================
-- Test migrazione 0025 (Fase 31): Rewards e referral
-- =====================================================================
\set ON_ERROR_STOP on

begin;
reset role;
set local session_replication_role = replica;
update public.professional_profiles set is_published = true, review_status = 'approvato' where id in (tests.id('pp_officina'), tests.id('pp_dealer'));
set local session_replication_role = origin;

-- Programma disattivato: nessun punto.
select tests.as_user(tests.id('cliente'));
insert into public.requests (kind, requester_id, professional_profile_id, subject, message) values ('preventivo', tests.id('cliente'), tests.id('pp_officina'), 'Freni Panda', 'Preventivo per pastiglie e dischi anteriori');
insert into tests.ids select 'rq1', id from public.requests where subject = 'Freni Panda';
reset role;
update public.requests set status = 'completata' where id = tests.id('rq1');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.points_ledger) = 0, 'programma disattivato: nessun punto');
select tests.expect_error($$insert into public.points_ledger (user_id, amount, kind) values (tests.id('cliente'), 1000, 'guadagno')$$, 'il client non può scrivere movimenti');
select tests.expect_error($$select public.redeem_reward(gen_random_uuid(), 'chiave-prova-1')$$, 'nessun riscatto a programma disattivato');

-- Attivazione da parte dello staff
select tests.as_user(tests.id('admin'));
select public.admin_set_setting('rewards_enabled', 'true');
update public.reward_rules set active = true;
select tests.as_user(tests.id('cliente'));
update public.reward_rules set points = 99999;
select tests.expect((select count(*) from public.reward_rules where points = 99999) = 0, 'un utente non modifica le regole');

-- Assegnazione su evento confermato dal professionista
insert into public.requests (kind, requester_id, professional_profile_id, subject, message) values ('preventivo', tests.id('cliente'), tests.id('pp_officina'), 'Tagliando 60k', 'Tagliando completo dei 60.000 km');
insert into tests.ids select 'rq2', id from public.requests where subject = 'Tagliando 60k';
select tests.expect((select count(*) from public.points_ledger) = 0, 'richiesta solo inviata: nessun punto');
reset role;
update public.requests set status = 'completata' where id = tests.id('rq2');
update public.requests set status = 'completata' where id = tests.id('rq2');
select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.points_ledger where rule_key = 'servizio_completato') = 1, 'servizio completato: punti assegnati una sola volta');
select tests.expect((select count(*) from public.points_ledger where rule_key = 'primo_servizio') = 1, 'bonus primo servizio');
select tests.expect(((public.rewards_wallet()) ->> 'balance')::integer = 200, 'saldo derivato dai movimenti = 200');
reset role;
update public.requests set status = 'annullata' where id = tests.id('rq2');
select tests.as_user(tests.id('cliente'));
select tests.expect(((public.rewards_wallet()) ->> 'balance')::integer = 100, 'operazione annullata: punti stornati');
select tests.expect((select count(*) from public.notifications where title like '+%punti AutoGarage24 Rewards') >= 1, 'notifica punti guadagnati');
select tests.expect_error($$update public.points_ledger set amount = 99999$$, 'registro non modificabile');

-- Recensioni: nessun punto
select tests.expect((select count(*) from public.reward_rules where key like '%recension%') = 0, 'nessuna regola premia le recensioni');

-- Catalogo premi: il partner propone, lo staff pubblica
select tests.as_user(tests.id('officina'));
insert into public.reward_items (profile_id, title, description, category, points_cost, benefit_type, benefit_value, conditions, quantity_total, per_user_limit, valid_until, status)
values (tests.id('pp_officina'), 'Sconto 10% tagliando', 'Sconto del 10% sulla manodopera del tagliando presso la nostra officina.', 'manutenzione', 150, 'percentuale', 10,
        'Valido su appuntamento, non cumulabile con altre promozioni.', 2, 1, current_date + 60, 'in_revisione');
insert into tests.ids select 'item1', id from public.reward_items where title = 'Sconto 10% tagliando';
select tests.expect_error($$update public.reward_items set status = 'pubblicato' where id = tests.id('item1')$$, 'il partner non pubblica da solo');
select tests.as_user(tests.id('dealer'));
update public.reward_items set points_cost = 1 where id = tests.id('item1');
select tests.as_user(tests.id('admin'));
select tests.expect((select points_cost = 150 from public.reward_items where id = tests.id('item1')), 'un altro partner non modifica il premio');
select public.admin_review_reward_item(tests.id('item1'), 'pubblicato');

-- Riscatto
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.redeem_reward(tests.id('item1'), 'chiave-riscatto-1')$$, 'saldo insufficiente (100 < 150)');
select tests.expect(((public.rewards_wallet()) ->> 'balance')::integer = 100, 'nessun saldo negativo dopo il rifiuto');
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_adjust_points(tests.id('cliente'), 100, 'ok')$$, 'rettifica senza motivazione rifiutata');
select public.admin_adjust_points(tests.id('cliente'), 100, 'Accredito di cortesia per disservizio del 18/11');
select tests.expect((select count(*) from public.admin_audit_logs where action = 'rewards.adjust') = 1, 'rettifica nel registro attività con motivazione');
select tests.as_user(tests.id('cliente'));
insert into tests.ids select 'red1', redemption_id from public.redeem_reward(tests.id('item1'), 'chiave-riscatto-1');
select tests.expect((select redemption_id = tests.id('red1') from public.redeem_reward(tests.id('item1'), 'chiave-riscatto-1')), 'doppio invio: stesso riscatto, nessun doppio addebito');
select tests.expect(((public.rewards_wallet()) ->> 'balance')::integer = 50, 'saldo 200 − 150 = 50');
select tests.expect_error($$select public.redeem_reward(tests.id('item1'), 'chiave-riscatto-2')$$, 'limite per utente rispettato');
select tests.expect((select code ~ '^RW-[A-Z0-9]{10}$' and coupon_id is not null from public.reward_redemptions where id = tests.id('red1')), 'codice univoco e voucher monouso');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.reward_redemptions) = 0, 'gli altri utenti non vedono i riscatti');
reset role;
create temp table _rcode as select code from public.reward_redemptions where id = tests.id('red1');
grant select on _rcode to authenticated;
select tests.as_user(tests.id('dealer'));
select tests.expect((select count(*) from public.verify_reward_code((select code from _rcode))) = 0, 'un altro partner non verifica il codice');
select tests.expect_error($$select public.use_reward_code((select code from _rcode))$$, 'né lo usa');
select tests.as_user(tests.id('officina'));
select tests.expect((select status = 'emesso' from public.verify_reward_code((select code from public.reward_redemptions where id = tests.id('red1')))), 'il partner verifica il codice');
select public.use_reward_code((select code from public.reward_redemptions where id = tests.id('red1')));
select tests.expect_error($$select public.use_reward_code((select code from public.reward_redemptions where id = tests.id('red1')))$$, 'lo stesso codice non si usa due volte');
select tests.expect_error($$select public.cancel_reward_redemption(tests.id('red1'), 'test')$$, 'un codice usato non si annulla');

-- Rimborso di un voucher non usato
select tests.as_user(tests.id('admin'));
select public.admin_adjust_points(tests.id('cliente2'), 300, 'Accredito di prova per il test del rimborso');
select tests.as_user(tests.id('cliente2'));
insert into tests.ids select 'red2', redemption_id from public.redeem_reward(tests.id('item1'), 'chiave-riscatto-c2');
select tests.expect((select count(*) from public.reward_items where id = tests.id('item1')) = 0, 'premio esaurito non più in catalogo');
select tests.expect_error($$select public.redeem_reward(tests.id('item1'), 'chiave-riscatto-c2b')$$, 'premio esaurito non riscattabile');
reset role;
select tests.expect((select quantity_left = 0 and status = 'esaurito' from public.reward_items where id = tests.id('item1')), 'quantità esaurita');
select tests.as_user(tests.id('cliente2'));
select public.cancel_reward_redemption(tests.id('red2'));
select tests.expect(((public.rewards_wallet()) ->> 'balance')::integer = 300, 'annullamento: punti restituiti');
select tests.as_user(tests.id('admin'));
select tests.expect((select quantity_left = 1 from public.reward_items where id = tests.id('item1')), 'quantità ripristinata');

-- Revoca di un accredito fraudolento
select public.admin_revoke_points((select id from public.points_ledger where user_id = tests.id('cliente') and rule_key = 'primo_servizio'), 'Servizio fittizio segnalato dal partner');
select tests.expect_error($$select public.admin_revoke_points((select id from public.points_ledger where user_id = tests.id('cliente') and rule_key = 'primo_servizio'), 'Servizio fittizio segnalato dal partner')$$, 'nessuna doppia revoca');
select tests.expect((select count(*) from public.admin_audit_logs where action = 'rewards.revoke') = 1, 'revoca registrata');

-- Livelli
update public.reward_tiers set min_points = 100 where code = 'silver';
select tests.as_user(tests.id('cliente'));
select tests.expect(((public.rewards_wallet()) -> 'tier' ->> 'code') = 'silver', 'livello calcolato dai punti guadagnati');

-- Referral
select tests.as_user(tests.id('cliente'));
create temp table _code as select public.my_referral_code() c;
reset role; grant select on _code to authenticated; select tests.as_user(tests.id('cliente'));
select tests.expect((select c ~ '^[A-Z0-9]{8}$' from _code), 'codice personale');
select tests.expect((select public.my_referral_code() = (select c from _code)), 'codice stabile');
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000051', 'invitato@test.local', jsonb_build_object('full_name', 'Invitato', 'accepted_terms', 'true', 'referral_code', (select c from _code))),
  ('10000000-0000-0000-0000-000000000052', 'cliente+2@test.local', jsonb_build_object('full_name', 'Doppione', 'accepted_terms', 'true', 'referral_code', (select c from _code)));
select tests.expect((select status = 'registrato' and program = 'utente' from public.referrals where referred_id = '10000000-0000-0000-0000-000000000051'), 'invito valido collegato all''invitante');
select tests.expect((select status = 'in_verifica' and 'stessa_email_normalizzata' = any(signals) from public.referrals where referred_id = '10000000-0000-0000-0000-000000000052'), 'auto-invito con email alias: in verifica, nessun premio automatico');
select tests.expect((select count(*) from public.points_ledger where source_kind = 'referral') = 0, 'nessun premio per la sola registrazione');
-- servizio completato dall'invitato → qualificato e premiato
select tests.as_user('10000000-0000-0000-0000-000000000051');
insert into public.requests (kind, requester_id, professional_profile_id, subject, message) values ('preventivo', '10000000-0000-0000-0000-000000000051', tests.id('pp_officina'), 'Gomme invitato', 'Cambio gomme stagionale');
reset role;
update public.requests set status = 'completata' where subject = 'Gomme invitato';
select tests.expect((select status = 'premiato' from public.referrals where referred_id = '10000000-0000-0000-0000-000000000051'), 'invito premiato dopo il primo servizio verificato');
select tests.expect((select count(*) from public.points_ledger where rule_key = 'referral_invitante' and user_id = tests.id('cliente')) = 1, 'punti all''invitante');
select tests.as_user(tests.id('cliente2'));
select tests.expect((select count(*) from public.referrals) = 0, 'gli inviti altrui non sono visibili');
-- Scadenza: solo i punti guadagnati non consumati, una sola volta
reset role;
set local session_replication_role = replica;
insert into public.points_ledger (user_id, amount, kind, rule_key, source_kind, source_id, expires_at)
values (tests.id('cliente2'), 40, 'guadagno', 'registrazione', 'account', tests.id('cliente2'), now() - interval '1 day');
set local session_replication_role = origin;
select private.expire_points();
select private.expire_points();
select tests.expect(private.points_balance(tests.id('cliente2')) = 300, 'punti scaduti stornati una sola volta (340 → 300)');
select tests.expect((select count(*) from public.points_ledger where user_id = tests.id('cliente2') and kind = 'scadenza') = 1, 'un solo movimento di scadenza');
-- Email confermata → benvenuto, una volta
update auth.users set email_confirmed_at = now() where id = '10000000-0000-0000-0000-000000000051';
update auth.users set email_confirmed_at = null where id = '10000000-0000-0000-0000-000000000051';
update auth.users set email_confirmed_at = now() where id = '10000000-0000-0000-0000-000000000051';
select tests.expect((select count(*) from public.points_ledger where user_id = '10000000-0000-0000-0000-000000000051' and rule_key = 'registrazione') = 1, 'benvenuto assegnato una sola volta');
select tests.expect(private.points_balance(tests.id('cliente')) >= 0 and private.points_balance(tests.id('cliente2')) >= 0, 'nessun saldo negativo');
rollback;

select '=== TEST FASE 31 SUPERATI ===';

-- =====================================================================
-- Test migrazione 0023 (Fase 30): Business Center
-- =====================================================================
\set ON_ERROR_STOP on

insert into tests.ids values ('dipendente', '10000000-0000-0000-0000-000000000041');
insert into auth.users (id, email, raw_user_meta_data) values
  (tests.id('dipendente'), 'dipendente@test.local', jsonb_build_object('full_name', 'Dipendente Rossi', 'accepted_terms', 'true', 'requested_role', 'cliente'));

begin;
reset role;
set local session_replication_role = replica;
update public.professional_profiles set is_published = true, review_status = 'approvato' where id in (tests.id('pp_officina'), tests.id('pp_dealer'));
set local session_replication_role = origin;
commit;

begin;
-- Contatti reali verso l'officina: una richiesta di preventivo e una visualizzazione del profilo.
select tests.as_user(tests.id('cliente'));
insert into public.requests (kind, requester_id, professional_profile_id, subject, message)
values ('preventivo', tests.id('cliente'), tests.id('pp_officina'), 'Tagliando Panda', 'Vorrei un preventivo per il tagliando dei 60.000 km');
select tests.as_anon();
select public.track_profile_view((select slug from public.professional_profiles where id = tests.id('pp_officina')));
select public.track_profile_view((select slug from public.professional_profiles where id = tests.id('pp_officina')));

select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.my_businesses() where profile_id = tests.id('pp_officina') and role = 'proprietario') = 1, 'il titolare vede la propria azienda');
select tests.expect((select count(*) from public.business_leads(tests.id('pp_officina')) where title = 'Tagliando Panda') = 1, 'la richiesta reale compare tra i contatti');
insert into tests.ids select 'lead1', source_id from public.business_leads(tests.id('pp_officina')) where title = 'Tagliando Panda';
select tests.expect((select (business_stats ->> 'profile_views')::integer = 2 and (business_stats ->> 'contacts')::integer between 1 and 4 and business_stats -> 'conv_contact_appt' = 'null'::jsonb
  from public.business_stats(tests.id('pp_officina'), now() - interval '7 days', now())), 'statistiche reali; nessuna percentuale con meno di 5 casi');
select public.set_lead_status(tests.id('pp_officina'), 'richiesta', tests.id('lead1'), 'da_contattare');
select public.add_lead_note(tests.id('pp_officina'), 'richiesta', tests.id('lead1'), 'Richiamare dopo le 17');
select tests.expect_error($$select public.set_lead_status(tests.id('pp_officina'), 'richiesta', gen_random_uuid(), 'da_contattare')$$, 'nessuno stato su contatti inesistenti');
select tests.expect((select (business_profile_completeness ->> 'score')::integer between 0 and 100 from public.business_profile_completeness(tests.id('pp_officina'))), 'punteggio di completezza calcolato');

-- Collaboratori
insert into tests.ids select 'm1', public.invite_business_member(tests.id('pp_officina'), 'Dipendente@test.local', 'dipendente');
select tests.expect_error($$select public.invite_business_member(tests.id('pp_officina'), 'dipendente@test.local', 'dipendente')$$, 'nessun invito doppio');
select tests.as_user(tests.id('cliente2'));
select tests.expect_error($$select public.accept_business_invite(tests.id('m1'))$$, 'l''invito vale solo per l''email invitata');
select tests.expect_error($$select * from public.business_leads(tests.id('pp_officina'))$$, 'un estraneo non vede i contatti');
select tests.as_user(tests.id('dipendente'));
select tests.expect_error($$select * from public.business_leads(tests.id('pp_officina'))$$, 'prima di accettare nessun accesso');
select public.accept_business_invite(tests.id('m1'));
select tests.expect((select count(*) from public.business_leads(tests.id('pp_officina')) where source_id = tests.id('lead1')) = 1, 'il dipendente vede i contatti');
select tests.expect((select conversation_id is null from public.business_leads(tests.id('pp_officina')) where source_id = tests.id('lead1')), 'ma non le conversazioni personali del titolare');
select tests.expect((select count(*) from public.business_lead_notes where profile_id = tests.id('pp_officina')) = 1, 'il team vede le note interne');
select tests.expect_error($$select public.business_stats(tests.id('pp_officina'), now() - interval '7 days', now())$$, 'il dipendente non ha accesso alle statistiche');
select tests.expect_error($$select public.invite_business_member(tests.id('pp_officina'), 'altro@test.local', 'dipendente')$$, 'il dipendente non gestisce il team');
select tests.expect_error($$select public.update_business_member(tests.id('m1'), 'amministratore')$$, 'nessuno modifica i propri permessi');
select tests.expect_error($$select * from public.business_leads(tests.id('pp_dealer'))$$, 'isolamento tra aziende');
insert into public.business_tasks (profile_id, title, kind, priority, due_at) values (tests.id('pp_officina'), 'Richiamare il cliente Panda', 'richiamare', 'alta', now() + interval '1 hour');
select tests.expect_error($$insert into public.business_tasks (profile_id, title) values (tests.id('pp_dealer'), 'Intrusione')$$, 'nessuna attività su un''altra azienda');

select tests.as_user(tests.id('cliente'));
select tests.expect((select count(*) from public.business_lead_notes) = 0 and (select count(*) from public.business_lead_states) = 0, 'il cliente non vede mai note e stati interni');

reset role;
select private.process_business_tasks();
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.notifications where title like 'Attività in scadenza%') = 1, 'promemoria dell''attività al titolare');
select public.update_business_member(tests.id('m1'), null, null, true);
select tests.as_user(tests.id('dipendente'));
select tests.expect_error($$select * from public.business_leads(tests.id('pp_officina'))$$, 'dopo la revoca nessun accesso');
select tests.as_user(tests.id('officina'));
select tests.expect((select count(*) from public.business_audit where profile_id = tests.id('pp_officina')) >= 3, 'inviti, accettazione e revoca nel registro');
select tests.expect_error($$update public.business_audit set action = 'x'$$, 'registro non modificabile');

-- Piani: limiti verificati lato server
select tests.expect((select business_plan ->> 'plan_code' = 'free' from public.business_plan(tests.id('pp_officina'))), 'azienda nel piano gratuito');
select tests.as_user(tests.id('admin'));
select tests.expect_error($$select public.admin_assign_plan(tests.id('pp_officina'), 'professional')$$, 'nessun piano a pagamento attivabile senza approvazione');
select public.admin_set_plan_limits('free', '{"max_members": 1}');
select tests.as_user(tests.id('officina'));
insert into tests.ids select 'm2', public.invite_business_member(tests.id('pp_officina'), 'nuovo1@test.local', 'operatore');
select tests.expect_error($$select public.invite_business_member(tests.id('pp_officina'), 'nuovo2@test.local', 'operatore')$$, 'limite collaboratori del piano applicato lato server');
select tests.as_user(tests.id('admin'));
select tests.expect((select (admin_business_overview ->> 'partner_attivi')::integer >= 2 from public.admin_business_overview()), 'panoramica amministrativa da dati reali');
select tests.as_user(tests.id('cliente'));
select tests.expect_error($$select public.admin_business_overview()$$, 'panoramica riservata allo staff');
-- Esecuzione a nome del titolare: l'identità torna quella del collaboratore subito dopo.
reset role;
select set_config('request.jwt.claims', json_build_object('sub', tests.id('dipendente'), 'role', 'authenticated')::text, true);
select set_config('ag24.tmp', private.as_owner(tests.id('officina')), true);
select tests.expect(auth.uid() = tests.id('officina'), 'durante l''azione delegata agisce il titolare');
select private.restore_claims(current_setting('ag24.tmp'));
select tests.expect(auth.uid() = tests.id('dipendente'), 'identità del collaboratore ripristinata');
select tests.as_user(tests.id('dipendente'));
select tests.expect_error($$select public.business_respond_booking(tests.id('pp_officina'), gen_random_uuid(), 'conferma')$$, 'collaboratore revocato: nessuna gestione delle prenotazioni');
rollback;

select '=== TEST FASE 30 SUPERATI ===';

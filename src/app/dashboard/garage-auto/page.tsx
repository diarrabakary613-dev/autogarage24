import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Lock, Plus, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader, Spec } from "@/components/ui/misc";
import { FileUploader } from "@/components/ui/file-uploader";
import { MileageChart } from "@/components/garage/mileage-chart";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addMileage, deleteVehicle, registerVehiclePhoto, saveVehicle, setPrimaryVehicle } from "@/lib/actions/garage";
import { BRANDS, findBrand } from "@/config/brands";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { formatKm } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Il mio garage", robots: { index: false } };

export default function GaragePage(props: PageProps<"/dashboard/garage-auto">) {
  return (
    <>
      <PageHeader title="Il mio garage" description="Le tue automobili, il chilometraggio e lo storico. Targa e VIN sono facoltativi e visibili solo a te." actions={<ButtonLink href="/dashboard/garage-auto?nuova=1" icon={<Plus className="size-4" aria-hidden />}>Aggiungi automobile</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Garage searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Garage({ searchParams }: { searchParams: PageProps<"/dashboard/garage-auto">["searchParams"] }) {
  const user = await requireUser("/dashboard/garage-auto");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("*").is("deleted_at", null).order("is_primary", { ascending: false }).order("created_at");
  const adding = sp.nuova === "1" || !vehicles?.length;
  const v = adding ? null : vehicles!.find((x) => x.id === sp.auto) ?? vehicles![0];
  const photos = new Map<string, string>();
  const withPhoto = (vehicles ?? []).filter((x) => x.photo_path);
  if (withPhoto.length) {
    const { data } = await supabase.storage.from("vehicle-documents").createSignedUrls(withPhoto.map((x) => x.photo_path!), 600);
    data?.forEach((d, i) => d.signedUrl && photos.set(withPhoto[i].id, d.signedUrl));
  }
  const [logs, records, reminders, contacted, vehicleRequests, docsCount] = v ? await Promise.all([
    supabase.from("mileage_logs").select("value_km, recorded_on, is_inconsistent, source, note").eq("user_vehicle_id", v.id).order("recorded_on"),
    supabase.from("maintenance_records").select("id, title, performed_on, source").eq("user_vehicle_id", v.id).order("performed_on", { ascending: false }).limit(5),
    supabase.from("maintenance_reminders").select("id, title, category, due_date, due_mileage_km, status").eq("user_vehicle_id", v.id).in("status", ["attivo", "in_scadenza", "scaduto"]).order("due_date", { ascending: true, nullsFirst: false }).limit(5),
    supabase.rpc("vehicle_contacted_professionals", { vehicle_id: v.id }),
    supabase.from("requests").select("id, subject, status, created_at").eq("user_vehicle_id", v.id).eq("requester_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("user_vehicle_documents").select("id", { count: "exact", head: true }).eq("user_vehicle_id", v.id),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { count: 0 }];
  const { data: allReminders } = await supabase.from("maintenance_reminders").select("id, user_vehicle_id, title, due_date, status").in("status", ["attivo", "in_scadenza", "scaduto"]).not("due_date", "is", null).order("due_date").limit(3);

  return (
    <div className="flex flex-col gap-6">
      {(vehicles?.length ?? 0) > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-sm text-muted">Veicoli registrati</p><p className="text-2xl font-extrabold">{vehicles!.length}</p></Card>
          <Card className="p-4 sm:col-span-2"><p className="text-sm text-muted">Prossime scadenze</p>
            {!allReminders?.length ? <p className="text-sm">Nessuna scadenza inserita. <Link className="underline" href="/dashboard/manutenzione">Aggiungi revisione, assicurazione, bollo…</Link></p> : (
              <ul className="text-sm">{allReminders.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.title} · {vehicles!.find((x) => x.id === r.user_vehicle_id)?.model ?? ""}</span><span className={r.status === "scaduto" ? "text-danger" : r.status === "in_scadenza" ? "text-warning" : "text-muted"}>{formatDate(r.due_date)}</span></li>)}</ul>
            )}
            <Link className="mt-1 inline-block text-sm font-semibold underline" href="/dashboard/scadenze">Calendario delle scadenze</Link>
          </Card>
        </div>
      )}
      {(vehicles?.length ?? 0) > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles!.map((x) => (
            <li key={x.id}>
              <Link href={`/dashboard/garage-auto?auto=${x.id}`} aria-current={v?.id === x.id ? "true" : undefined} className={`flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-card ${v?.id === x.id ? "border-ink" : "border-line hover:border-line-strong"}`}>
                <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-mist">{photos.get(x.id) ? <Image src={photos.get(x.id)!} alt="" fill sizes="64px" className="object-cover" unoptimized /> : <Car className="size-6 text-muted" aria-hidden />}</span>
                <span className="min-w-0"><span className="block truncate font-bold">{x.make} {x.model}</span><span className="text-sm text-muted">{x.year ?? ""} · {formatKm(x.current_mileage_km)}</span>{x.is_primary && <Badge tone="orange" className="mt-1"><Star className="size-3" aria-hidden /> Principale</Badge>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">{vehicles?.length ? "Nuova automobile" : "Aggiungi la tua prima automobile"}</h2>
          <VehicleForm />
        </Card>
      )}
      {v && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            <Card className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{v.make} {v.model} {v.version ?? ""}</h2>
                <div className="flex flex-wrap gap-2">
                  {!v.is_primary && <ActionForm action={setPrimaryVehicle} submitLabel="Imposta come principale" size="sm" variant="outline" hidden={{ vehicle_id: v.id }} />}
                  <ButtonLink href={`/dashboard/manutenzione/storico?auto=${v.id}`} size="sm" variant="outline">Storico</ButtonLink>
                  <ButtonLink href={`/ricambi?auto=${v.id}#cerca`} size="sm" variant="ghost">Cerca ricambi</ButtonLink>
                  <ButtonLink href={`/richiedi-intervento?auto=${v.id}`} size="sm">Richiedi un intervento</ButtonLink>
                </div>
              </div>
              <dl>
                <Spec label="Anno" value={v.year} /><Spec label="Immatricolazione" value={v.registration_date ? formatDate(v.registration_date) : null} />
                <Spec label="Alimentazione" value={v.fuel ? FUEL_LABELS[v.fuel] : null} /><Spec label="Cambio" value={v.transmission ? TRANSMISSION_LABELS[v.transmission] : null} />
                <Spec label="Cilindrata" value={v.engine_cc ? `${v.engine_cc} cm³` : null} /><Spec label="Potenza" value={v.power_kw ? `${v.power_kw} kW` : null} />
                <Spec label="Codice motore" value={v.engine_code} /><Spec label="Chilometraggio attuale" value={v.current_mileage_km !== null ? formatKm(v.current_mileage_km) : null} />
                <Spec label="Data di acquisto" value={v.purchase_date ? formatDate(v.purchase_date) : null} />
                <Spec label={<span className="inline-flex items-center gap-1"><Lock className="size-3" aria-hidden /> Targa (privata)</span>} value={v.plate} />
                <Spec label={<span className="inline-flex items-center gap-1"><Lock className="size-3" aria-hidden /> VIN (privato)</span>} value={v.vin} />
              </dl>
              <details className="mt-4"><summary className="cursor-pointer font-semibold text-orange-700">Modifica i dati</summary><div className="mt-4"><VehicleForm v={v} /></div></details>
            </Card>
            <Card className="p-6">
              <h2 className="mb-3 text-lg font-bold">Chilometraggio</h2>
              <MileageChart points={(logs.data ?? []).map((l) => ({ date: l.recorded_on, km: l.value_km, bad: l.is_inconsistent }))} />
              <ActionForm action={addMileage} submitLabel="Registra" hidden={{ vehicle_id: v.id }} resetOnSuccess className="mt-4">
                {((s: FormState) => (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="km-v" label="Chilometri" error={s.fieldErrors?.value_km}><Input id="km-v" name="value_km" inputMode="numeric" /></Field>
                    <Field id="km-d" label="Data" error={s.fieldErrors?.recorded_on}><Input id="km-d" name="recorded_on" type="date" max={new Date().toISOString().slice(0, 10)} /></Field>
                    <Field id="km-n" label="Nota" optional><Input id="km-n" name="note" maxLength={300} /></Field>
                  </div>
                ))(initialFormState)}
              </ActionForm>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Foto</h2>
              {photos.get(v.id) && <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-mist"><Image src={photos.get(v.id)!} alt={`${v.make} ${v.model}`} fill sizes="380px" className="object-cover" unoptimized /></div>}
              <FileUploader bucket="vehicle-documents" folder={user.id} kind="image" label={photos.get(v.id) ? "Sostituisci la foto" : "Carica una foto"} onUploaded={registerVehiclePhoto.bind(null, v.id)} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Prossime scadenze</h2>
              {!reminders.data?.length ? <p className="text-sm text-muted">Nessuna scadenza per questa auto.</p> : <ul className="flex flex-col gap-1 text-sm">{reminders.data.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.title}</span><span className={r.status === "scaduto" ? "text-danger" : r.status === "in_scadenza" ? "text-warning" : "text-muted"}>{r.due_date ? formatDate(r.due_date) : r.due_mileage_km !== null ? `a ${formatKm(r.due_mileage_km)}` : ""}</span></li>)}</ul>}
              <p className="mt-2 text-xs text-muted">Date inserite da te: AutoGarage24 non verifica revisione, assicurazione o bollo con enti esterni.</p>
              <Link className="mt-2 inline-block text-sm font-semibold underline" href="/dashboard/manutenzione">Gestisci scadenze e promemoria</Link>
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Richieste e officine</h2>
              {!vehicleRequests.data?.length ? <p className="text-sm text-muted">Nessuna richiesta collegata a questa auto.</p> : <ul className="flex flex-col gap-1 text-sm">{vehicleRequests.data.map((q) => <li key={q.id} className="flex justify-between gap-2"><Link className="truncate underline" href={`/dashboard/richieste/${q.id}`}>{q.subject}</Link><span className="shrink-0 text-muted">{formatDate(q.created_at)}</span></li>)}</ul>}
              {(contacted.data?.length ?? 0) > 0 && <p className="mt-2 text-sm">Officine già contattate: {contacted.data!.map((c, i) => <span key={c.profile_id}>{i > 0 && ", "}<Link className="underline" href={`${c.professional_type === "meccanico" ? "/meccanici" : c.professional_type === "officina" ? "/garages" : "/professionisti"}/${c.slug}`}>{c.display_name}</Link></span>)}</p>}
              <p className="mt-2 text-sm"><Link className="underline" href={`/dashboard/documenti-auto?auto=${v.id}`}>Documenti privati ({docsCount.count ?? 0})</Link></p>
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Ultimi interventi</h2>
              {!records.data?.length ? <p className="text-sm text-muted">Nessun intervento registrato.</p> : <ul className="flex flex-col gap-1 text-sm">{records.data.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.title}</span><span className="text-muted">{formatDate(r.performed_on)}</span></li>)}</ul>}
              <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href="/garages" size="sm" variant="outline">Trova un&apos;officina</ButtonLink><ButtonLink href="/meccanici" size="sm" variant="ghost">Trova un meccanico</ButtonLink></div>
            </Card>
            <Alert tone="info">Targa e VIN non vengono mai mostrati ai professionisti o negli annunci. Quando invii una richiesta condividiamo solo marca, modello e anno.</Alert>
            <ActionForm action={deleteVehicle} submitLabel="Rimuovi dal garage" variant="danger" size="sm" hidden={{ vehicle_id: v.id }} confirm="Rimuovere l'automobile dal garage?" />
          </div>
        </div>
      )}
      {!vehicles?.length && <EmptyState title="Il tuo garage è vuoto" description="Aggiungi un'automobile per tenere traccia di manutenzione, scadenze e spese." />}
    </div>
  );
}

function VehicleForm({ v }: { v?: Tables<"user_vehicles"> }) {
  const known = v?.make_slug && findBrand(v.make_slug);
  return (
    <ActionForm action={saveVehicle} submitLabel={v ? "Salva" : "Aggiungi al garage"} hidden={{ vehicle_id: v?.id }}>
      {((s: FormState) => {
        const fe = s.fieldErrors ?? {};
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="gv-mk" label="Marca" error={fe.make_slug}><Select id="gv-mk" name="make_slug" defaultValue={known ? v!.make_slug! : v ? "altra" : ""}><option value="">Scegli…</option>{BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}<option value="altra">Altra</option></Select></Field>
            <Field id="gv-mo" label="Altra marca" optional><Input id="gv-mo" name="make_other" defaultValue={known ? "" : v?.make ?? ""} /></Field>
            <Field id="gv-md" label="Modello" error={fe.model}><Input id="gv-md" name="model" defaultValue={v?.model} /></Field>
            <Field id="gv-ve" label="Versione" optional><Input id="gv-ve" name="version" defaultValue={v?.version ?? ""} /></Field>
            <Field id="gv-y" label="Anno" optional><Input id="gv-y" name="year" inputMode="numeric" defaultValue={v?.year ?? ""} /></Field>
            <Field id="gv-rd" label="Data di immatricolazione" optional><Input id="gv-rd" name="registration_date" type="date" defaultValue={v?.registration_date ?? ""} /></Field>
            <Field id="gv-pd" label="Data di acquisto" optional><Input id="gv-pd" name="purchase_date" type="date" defaultValue={v?.purchase_date ?? ""} /></Field>
            <Field id="gv-f" label="Alimentazione" optional><Select id="gv-f" name="fuel" defaultValue={v?.fuel ?? ""}><option value="">—</option>{Object.entries(FUEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field id="gv-t" label="Cambio" optional><Select id="gv-t" name="transmission" defaultValue={v?.transmission ?? ""}><option value="">—</option>{Object.entries(TRANSMISSION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field id="gv-cc" label="Cilindrata (cm³)" optional><Input id="gv-cc" name="engine_cc" inputMode="numeric" defaultValue={v?.engine_cc ?? ""} /></Field>
            <Field id="gv-kw" label="Potenza (kW)" optional><Input id="gv-kw" name="power_kw" inputMode="decimal" defaultValue={v?.power_kw ?? ""} /></Field>
            <Field id="gv-ec" label="Codice motore" optional hint="Utile per la compatibilità dei ricambi."><Input id="gv-ec" name="engine_code" defaultValue={v?.engine_code ?? ""} /></Field>
            {!v && <Field id="gv-km" label="Chilometraggio attuale" optional><Input id="gv-km" name="current_mileage_km" inputMode="numeric" /></Field>}
            <Field id="gv-pl" label="Targa" optional error={fe.plate} hint="Privata."><Input id="gv-pl" name="plate" defaultValue={v?.plate ?? ""} autoComplete="off" /></Field>
            <Field id="gv-vin" label="VIN (telaio)" optional error={fe.vin} hint="Privato."><Input id="gv-vin" name="vin" defaultValue={v?.vin ?? ""} autoComplete="off" maxLength={17} /></Field>
          </div>
        );
      })(initialFormState)}
    </ActionForm>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteDriverProfile, saveDriverProfile } from "@/lib/actions/driver";
import { getPublishedRuleVersions } from "@/lib/data/neo";
import { driverSituation } from "@/lib/neopatentati/engine";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Profilo neopatentato", robots: { index: false } };

export default function DriverPage() {
  return (
    <>
      <PageHeader title="Profilo neopatentato" description="Salva la data della patente e le tue preferenze: ti mostriamo le auto adatte. Questi dati sono visibili solo a te." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/neopatentato");
  const supabase = await createClient();
  const [{ data: p }, versions] = await Promise.all([supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle(), getPublishedRuleVersions()]);
  const prefs = (p?.preferences ?? {}) as { fuel?: string | null; transmission?: string | null };
  const today = new Date().toISOString().slice(0, 10);
  const situation = p?.license_obtained_on ? driverSituation(versions, p.license_obtained_on, p.license_category === "altra" ? "altra" : "B", today) : null;
  const search = new URLSearchParams({ neo: situation?.kind === "expired" ? "" : "compatibili_da_verificare" });
  if (p?.budget_max_cents) search.set("prezzo_max", String(Math.round(p.budget_max_cents / 100)));
  if (p?.city_interest) search.set("citta", p.city_interest);
  if (prefs.fuel) search.set("alimentazione", prefs.fuel);
  if (prefs.transmission) search.set("cambio", prefs.transmission);
  for (const [k, v] of [...search.entries()]) if (!v) search.delete(k);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-6">
        <ActionForm action={saveDriverProfile} submitLabel="Salva profilo">
          {(s) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="dp-d" label="Data di conseguimento patente" error={s.fieldErrors?.license_obtained_on}><Input id="dp-d" name="license_obtained_on" type="date" max={today} defaultValue={p?.license_obtained_on ?? ""} /></Field>
              <Field id="dp-c" label="Categoria"><Select id="dp-c" name="license_category" defaultValue={p?.license_category ?? "B"}><option value="B">B</option><option value="B96">B96</option><option value="BE">BE</option><option value="altra">Altra</option></Select></Field>
              <Field id="dp-b" label="Budget massimo (€)" optional error={s.fieldErrors?.budget}><Input id="dp-b" name="budget" inputMode="numeric" defaultValue={p?.budget_max_cents ? String(p.budget_max_cents / 100) : ""} /></Field>
              <Field id="dp-ci" label="Città di interesse" optional><Input id="dp-ci" name="city_interest" defaultValue={p?.city_interest ?? ""} /></Field>
              <Field id="dp-f" label="Alimentazione preferita" optional><Select id="dp-f" name="fuel" defaultValue={prefs.fuel ?? ""}><option value="">Indifferente</option>{Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field id="dp-t" label="Cambio preferito" optional><Select id="dp-t" name="transmission" defaultValue={prefs.transmission ?? ""}><option value="">Indifferente</option>{Object.entries(TRANSMISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            </div>
          )}
        </ActionForm>
        {p && (
          <div className="mt-6 border-t border-line pt-4">
            <ActionForm action={deleteDriverProfile} submitLabel="Cancella i miei dati neopatentato" variant="danger" size="sm" confirm="Cancellare definitivamente questi dati?" />
          </div>
        )}
      </Card>
      <div className="flex flex-col gap-4">
        {situation && <Alert tone={situation.kind === "limited" ? "info" : situation.kind === "expired" ? "success" : "warning"}>{situation.message}</Alert>}
        <ButtonLink href={`/auto-per-neopatentati?${search}#ricerca`}>Vedi le auto adatte a me</ButtonLink>
        <p className="text-xs text-muted">Usiamo la data della patente solo per calcolare i limiti applicabili. Non la condividiamo con venditori o professionisti.</p>
      </div>
    </div>
  );
}

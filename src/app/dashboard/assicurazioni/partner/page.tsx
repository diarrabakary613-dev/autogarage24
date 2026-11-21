import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { partnerUpdateRequest, submitInsuranceQuote } from "@/lib/actions/insurance";
import { COVERAGES, RP_STATUS } from "@/lib/insurance/labels";
import { nowMs } from "@/lib/bookings/time";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Richieste ricevute — partner assicurativo", robots: { index: false } };

export default function PartnerInsurancePage() {
  return (
    <>
      <PageHeader title="Richieste di preventivo ricevute" description="Richieste inoltrate con il consenso dei clienti. Usa i dati solo per formulare il preventivo e secondo la tua informativa privacy." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/assicurazioni/partner");
  const supabase = await createClient();
  const { data: mine } = await supabase.from("insurance_partner_users").select("partner_id, insurance_partners(name, status)").eq("user_id", user.id);
  if (!mine?.length) return <EmptyState title="Non sei referente di un partner assicurativo" description="I referenti sono abilitati dallo staff dopo la verifica dell'iscrizione al RUI o all'Albo IVASS." />;
  const ids = mine.map((m) => m.partner_id);
  const { data: rows } = await supabase.from("insurance_request_partners").select("*, insurance_quote_requests(*)").in("partner_id", ids).order("updated_at", { ascending: false }).limit(100);
  const today = new Date(nowMs() + 15 * 864e5).toISOString().slice(0, 10);
  if (!rows?.length) return <EmptyState title="Nessuna richiesta ricevuta" />;
  return (
    <div className="flex flex-col gap-4">{rows.map((rp) => {
      const r = rp.insurance_quote_requests as unknown as { id: string; vehicle_make: string; vehicle_model: string; vehicle_year: number | null; fuel: string | null; power_kw: number | null;
        registration_date: string | null; plate: string | null; coverages: string[]; province: string; postal_code: string | null; desired_start: string | null; contact_channel: string; contact_phone: string | null; notes: string | null } | null;
      if (!r) return <Card key={rp.id} className="p-4 text-sm text-muted">Richiesta ritirata dal cliente: dati non più disponibili.</Card>;
      const open = !["ritirata", "chiusa", "non_quotabile"].includes(rp.status);
      return (
        <Card key={rp.id} className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.vehicle_make} {r.vehicle_model}{r.vehicle_year ? ` (${r.vehicle_year})` : ""}</p><Badge tone={RP_STATUS[rp.status].tone}>{RP_STATUS[rp.status].label}</Badge></div>
          <p className="text-sm">{r.coverages.map((c) => COVERAGES[c]?.label).join(", ")} · {r.province}{r.postal_code ? ` ${r.postal_code}` : ""}{r.fuel ? ` · ${r.fuel}` : ""}{r.power_kw ? ` · ${r.power_kw} kW` : ""}{r.registration_date ? ` · immatricolata ${formatDate(r.registration_date)}` : ""}{r.plate ? ` · targa ${r.plate}` : ""}</p>
          <p className="text-xs text-muted">Consenso del {formatDateTime(rp.consent_at)} · contatto preferito: {r.contact_channel}{r.contact_phone ? ` (${r.contact_phone})` : ""}{r.desired_start ? ` · decorrenza ${formatDate(r.desired_start)}` : ""}</p>
          {r.notes && <p className="text-sm">{r.notes}</p>}
          {open && (
            <>
              <ActionForm action={partnerUpdateRequest} submitLabel="Aggiorna lo stato" size="sm" variant="outline" hidden={{ id: rp.id }}>
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <Field id={`s-${rp.id}`} label="Stato"><Select id={`s-${rp.id}`} name="status"><option value="in_lavorazione">In lavorazione</option><option value="non_quotabile">Non quotabile</option><option value="chiusa">Chiusa</option></Select></Field>
                  <Field id={`n-${rp.id}`} label="Nota per il cliente" optional><Input id={`n-${rp.id}`} name="note" maxLength={1000} /></Field>
                </div>
              </ActionForm>
              <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer font-semibold">Invia un preventivo</summary>
                <ActionForm action={submitInsuranceQuote} submitLabel="Invia il preventivo" hidden={{ id: rp.id }} className="mt-3">
                  {(s) => (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field id={`pn-${rp.id}`} label="Prodotto" error={s.fieldErrors?.product_name}><Input id={`pn-${rp.id}`} name="product_name" required maxLength={160} /></Field>
                      <Field id={`pr-${rp.id}`} label="Premio annuo (€)" error={s.fieldErrors?.premium}><Input id={`pr-${rp.id}`} name="premium" type="number" step="0.01" min={10} required /></Field>
                      <Field id={`cv-${rp.id}`} label="Coperture incluse" error={s.fieldErrors?.coverages} className="sm:col-span-2"><Textarea id={`cv-${rp.id}`} name="coverages" rows={2} required maxLength={2000} /></Field>
                      <Field id={`fr-${rp.id}`} label="Franchigie e scoperti" optional><Input id={`fr-${rp.id}`} name="deductibles" maxLength={1000} /></Field>
                      <Field id={`ms-${rp.id}`} label="Massimali" optional><Input id={`ms-${rp.id}`} name="limits" maxLength={1000} /></Field>
                      <Field id={`ex-${rp.id}`} label="Esclusioni principali" optional className="sm:col-span-2"><Textarea id={`ex-${rp.id}`} name="exclusions" rows={2} maxLength={2000} /></Field>
                      <Field id={`du-${rp.id}`} label="Durata (mesi)" error={s.fieldErrors?.duration_months}><Input id={`du-${rp.id}`} name="duration_months" type="number" min={1} max={36} defaultValue={12} required /></Field>
                      <Field id={`va-${rp.id}`} label="Valido fino al" error={s.fieldErrors?.valid_until}><Input id={`va-${rp.id}`} name="valid_until" type="date" defaultValue={today} required /></Field>
                      <Field id={`dc-${rp.id}`} label="Link al set informativo (https)" error={s.fieldErrors?.documents_url} className="sm:col-span-2"><Input id={`dc-${rp.id}`} name="documents_url" type="url" required /></Field>
                      <Field id={`bu-${rp.id}`} label="Link per proseguire sul tuo sito (https)" optional error={s.fieldErrors?.purchase_url} className="sm:col-span-2"><Input id={`bu-${rp.id}`} name="purchase_url" type="url" /></Field>
                    </div>
                  )}
                </ActionForm>
              </details>
            </>
          )}
        </Card>
      );
    })}</div>
  );
}

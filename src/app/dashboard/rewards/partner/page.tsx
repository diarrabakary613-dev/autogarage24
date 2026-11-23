import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { partnerCancelRedemption, saveRewardItem, setRewardItemStatus, consumeRewardCode } from "@/lib/actions/rewards";
import { BENEFIT_TYPES, benefitText, fmtPoints, ITEM_CATEGORIES, ITEM_STATUS, REDEMPTION_STATUS } from "@/lib/rewards/labels";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Premi Rewards (partner)", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;

export default function PartnerRewardsPage(props: PageProps<"/dashboard/rewards/partner">) {
  return (
    <>
      <PageHeader eyebrow="Partner" title="Premi AutoGarage24 Rewards" description="Proponi premi che i clienti possono ottenere con i punti, verifica e convalida i codici in sede. Ogni premio è pubblicato solo dopo l'approvazione dello staff." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("/dashboard/rewards/partner");
  const sp = await searchParams;
  const tab = ["premi", "nuovo", "codici"].includes(String(sp.tab)) ? String(sp.tab) : "codici";
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name, review_status").eq("user_id", user.id).is("deleted_at", null);
  if (!profiles?.length) return <EmptyState title="Serve un profilo professionale" description="I premi possono essere proposti da officine, meccanici, ricambisti e altri partner registrati." action={<ButtonLink href="/diventa-partner">Diventa partner</ButtonLink>} />;
  const profile = profiles[0];
  const editId = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : null;
  const [{ data: items }, { data: reds }] = await Promise.all([
    supabase.from("reward_items").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("reward_redemptions").select("id, code, status, points_spent, valid_until, used_at, created_at, item_id").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(200),
  ]);
  const editing = editId ? items?.find((i) => i.id === editId) : undefined;
  const byItem = new Map<string, { total: number; used: number }>();
  for (const r of reds ?? []) { const s = byItem.get(r.item_id) ?? { total: 0, used: 0 }; s.total++; if (r.status === "utilizzato") s.used++; byItem.set(r.item_id, s); }
  return (
    <>
      <TabLinks current={editing ? "nuovo" : tab} items={[
        { key: "codici", label: "Verifica codici", href: "/dashboard/rewards/partner" }, { key: "premi", label: "I miei premi", href: "/dashboard/rewards/partner?tab=premi", count: items?.length },
        { key: "nuovo", label: editing ? "Modifica premio" : "Nuovo premio", href: "/dashboard/rewards/partner?tab=nuovo" },
      ]} />
      {sp.salvato && <Alert tone="success" className="mb-4">Premio salvato.</Alert>}
      {tab === "codici" && !editing && <Codes reds={reds ?? []} items={items ?? []} />}
      {(tab === "nuovo" || editing) && <Card className="p-5"><ItemForm profileId={profile.id} i={editing} /></Card>}
      {tab === "premi" && !editing && (!items?.length ? <EmptyState title="Nessun premio" description="Proponi un premio reale che puoi erogare: sconto, servizio o omaggio, con condizioni chiare." action={<ButtonLink href="/dashboard/rewards/partner?tab=nuovo">Nuovo premio</ButtonLink>} /> : (
        <ul className="flex flex-col gap-3">{items.map((i) => {
          const s = byItem.get(i.id);
          return (
            <li key={i.id}><Card className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div><p className="font-bold">{i.title} <Badge tone={i.status === "pubblicato" ? "success" : i.status === "rifiutato" ? "danger" : "neutral"}>{ITEM_STATUS[i.status as keyof typeof ITEM_STATUS]}</Badge></p>
                <p className="text-sm">{benefitText(i.benefit_type, i.benefit_value)} · {fmtPoints(i.points_cost)} · fino al {formatDate(i.valid_until)}{i.quantity_total ? ` · ${i.quantity_left}/${i.quantity_total} disponibili` : ""}</p>
                <p className="text-xs text-muted">Riscatti {s?.total ?? 0} · utilizzati {s?.used ?? 0}</p>
                {i.review_note && <p className="text-xs">Nota dello staff: {i.review_note}</p>}</div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/dashboard/rewards/partner?id=${i.id}`} size="sm" variant="outline">Modifica</ButtonLink>
                {["bozza", "rifiutato", "sospeso"].includes(i.status) && <ActionForm action={setRewardItemStatus} submitLabel="Invia in approvazione" size="sm" hidden={{ id: i.id, status: "in_revisione" }} />}
                {i.status === "pubblicato" && <ActionForm action={setRewardItemStatus} submitLabel="Sospendi" size="sm" variant="ghost" hidden={{ id: i.id, status: "sospeso" }} confirm="Sospendere il premio? I codici già emessi restano validi." />}
              </div>
            </Card></li>
          );
        })}</ul>
      ))}
    </>
  );
}

function Codes({ reds, items }: { reds: { id: string; code: string; status: string; points_spent: number; valid_until: string; used_at: string | null; created_at: string; item_id: string }[]; items: Tables<"reward_items">[] }) {
  const title = new Map(items.map((i) => [i.id, i.title]));
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="font-bold">Convalida un codice</h2>
        <p className="mt-1 text-sm text-muted">Il cliente mostra il codice RW-… dalla sua area Rewards. Confrontalo con l&apos;elenco qui sotto, poi convalidalo: un codice si usa una sola volta.</p>
        <ActionForm action={consumeRewardCode} submitLabel="Segna come utilizzato" resetOnSuccess className="mt-3">
          {((state: FormState) => <Field id="code" label="Codice premio" error={state.fieldErrors?.code}><Input id="code" name="code" required placeholder="RW-XXXXXXXXXX" autoComplete="off" className="font-mono uppercase" /></Field>)(initialFormState)}
        </ActionForm>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Codici emessi</h2>
        {!reds.length ? <p className="mt-2 text-sm text-muted">Nessun premio riscattato finora.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{reds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span><span className="font-mono font-bold">{r.code}</span> · {title.get(r.item_id)} · emesso {formatDateTime(r.created_at)} · valido fino al {formatDate(r.valid_until)}{r.used_at ? ` · usato ${formatDateTime(r.used_at)}` : ""}</span>
              <span className="flex items-center gap-2"><Badge tone={r.status === "emesso" ? "orange" : r.status === "utilizzato" ? "success" : "neutral"}>{REDEMPTION_STATUS[r.status as keyof typeof REDEMPTION_STATUS]}</Badge>
                {r.status === "emesso" && <ActionForm action={partnerCancelRedemption} submitLabel="Annulla" size="sm" variant="ghost" hidden={{ id: r.id }} confirm="Annullare il codice? I punti tornano al cliente.">
                  {((state: FormState) => <Field id={`reason-${r.id}`} label="Motivo" error={state.fieldErrors?.reason}><Input id={`reason-${r.id}`} name="reason" required minLength={5} /></Field>)(initialFormState)}
                </ActionForm>}</span>
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}

function ItemForm({ profileId, i }: { profileId: string; i?: Tables<"reward_items"> }) {
  return (
    <ActionForm action={saveRewardItem} submitLabel="Salva bozza" hidden={{ profile_id: profileId, ...(i ? { id: i.id } : {}) }}>
      {((state: FormState) => {
        const e = state.fieldErrors ?? {};
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="title" label="Titolo" error={e.title} className="md:col-span-2"><Input id="title" name="title" required minLength={5} maxLength={120} defaultValue={i?.title} /></Field>
            <Field id="description" label="Descrizione" error={e.description} className="md:col-span-2"><Textarea id="description" name="description" required minLength={20} rows={3} defaultValue={i?.description} /></Field>
            <Field id="category" label="Categoria" error={e.category}><Select id="category" name="category" defaultValue={i?.category ?? ""} required><option value="" disabled>Scegli</option>{Object.entries(ITEM_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field id="benefit_type" label="Tipo di premio" error={e.benefit_type}><Select id="benefit_type" name="benefit_type" defaultValue={i?.benefit_type ?? ""} required><option value="" disabled>Scegli</option>{Object.entries(BENEFIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field id="benefit_value" label="Valore (% o €)" hint="Non serve per «Servizio o omaggio»." error={e.benefit_value} optional><Input id="benefit_value" name="benefit_value" type="number" min={1} defaultValue={i?.benefit_value ?? ""} /></Field>
            <Field id="min_amount" label="Spesa minima (€)" error={e.min_amount} optional><Input id="min_amount" name="min_amount" type="number" min={1} defaultValue={i?.min_amount_cents ? i.min_amount_cents / 100 : ""} /></Field>
            <Field id="points_cost" label="Costo in punti" hint="Minimo 50." error={e.points_cost}><Input id="points_cost" name="points_cost" type="number" min={50} required defaultValue={i?.points_cost} /></Field>
            <Field id="min_tier" label="Livello minimo" optional><Select id="min_tier" name="min_tier" defaultValue={i?.min_tier ?? ""}><option value="">Tutti</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option></Select></Field>
            <Field id="quantity_total" label="Quantità disponibile" hint="Vuoto = senza limite." optional><Input id="quantity_total" name="quantity_total" type="number" min={1} defaultValue={i?.quantity_total ?? ""} /></Field>
            <Field id="per_user_limit" label="Riscatti per cliente"><Input id="per_user_limit" name="per_user_limit" type="number" min={1} max={20} defaultValue={i?.per_user_limit ?? 1} /></Field>
            <Field id="valid_until" label="Riscattabile fino al" error={e.valid_until}><Input id="valid_until" name="valid_until" type="date" required defaultValue={i?.valid_until} /></Field>
            <Field id="voucher_days" label="Validità del codice (giorni)"><Input id="voucher_days" name="voucher_days" type="number" min={7} max={365} defaultValue={i?.voucher_days ?? 60} /></Field>
            <Field id="conditions" label="Condizioni" hint="Es. su appuntamento, non cumulabile, esclusi ricambi." error={e.conditions} className="md:col-span-2"><Textarea id="conditions" name="conditions" required minLength={10} rows={3} defaultValue={i?.conditions} /></Field>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="submit" value="1" className="size-5 accent-orange" /> Invia subito allo staff per l&apos;approvazione</label>
          </div>
        );
      })(initialFormState)}
    </ActionForm>
  );
}

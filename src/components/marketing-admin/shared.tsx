import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { saveMarketingItem, setMarketingStatus } from "@/lib/actions/marketing";
import { AUDIENCES, CHANNELS, FORMATS, MARKETING_STATUSES, OBJECTIVES, SERVICES, TONES } from "@/lib/marketing/brief";
import type { Tables } from "@/lib/supabase/database.types";

export const KINDS = { creativita: "Creatività", contenuto_social: "Contenuto social", video: "Video", materiale: "Materiale pubblicitario", landing: "Landing page", brief: "Brief" } as const;
export const ASSET_ORIGINS = { higgsfield: "Generato con Higgsfield", fotografia_propria: "Fotografia propria", licenza_acquistata: "Licenza acquistata", creato_internamente: "Creato internamente", altro: "Altro" } as const;
const opts = (o: Record<string, string>) => Object.entries(o).map(([k, l]) => <option key={k} value={k}>{l}</option>);

export function MarketingTabs({ current }: { current: string }) {
  const b = "/admin/marketing";
  return <TabLinks current={current} items={[
    { key: "panoramica", label: "Panoramica", href: b }, { key: "campagne", label: "Campagne", href: `${b}/campagne` },
    { key: "contenuti", label: "Creatività e contenuti", href: `${b}/contenuti` }, { key: "calendario", label: "Calendario editoriale", href: `${b}/calendario` },
    { key: "brief", label: "Generatore di brief", href: `${b}/brief` }, { key: "landing", label: "Landing page", href: `${b}/landing` },
    { key: "pubblico", label: "Pubblico", href: `${b}/pubblico` }, { key: "risultati", label: "Risultati", href: `${b}/risultati` },
    { key: "esperimenti", label: "Esperimenti", href: `${b}/esperimenti` }, { key: "budget", label: "Budget", href: `${b}/budget` },
  ]} />;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "pubblicato" ? "success" : status === "approvato" ? "dark" : status === "da_approvare" ? "warning" : status === "archiviato" ? "neutral" : "orange";
  return <Badge tone={tone}>{MARKETING_STATUSES[status as keyof typeof MARKETING_STATUSES] ?? status}</Badge>;
}

/** Cambio di stato rapido (non consente «pubblicato»: serve la scheda con data e link reali). */
export function QuickStatus({ id, table, status }: { id: string; table: "campagna" | "contenuto"; status: string }) {
  return (
    <ActionForm action={setMarketingStatus} submitLabel="Aggiorna" size="sm" variant="outline" hidden={{ id, table }} className="flex items-center gap-2">
      <Select name="status" aria-label="Stato" defaultValue={status === "pubblicato" ? "approvato" : status} className="w-auto">
        {Object.entries(MARKETING_STATUSES).filter(([k]) => k !== "pubblicato").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>
    </ActionForm>
  );
}

const toLocal = (iso: string | null) => {
  if (!iso) return { d: "", t: "" };
  const dt = new Date(iso);
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(dt);
  return { d: f.slice(0, 10), t: f.slice(11, 16) };
};

export function MarketingItemForm({ item, campaigns, defaults = {} }: { item?: Tables<"marketing_items">; campaigns: { id: string; name: string }[]; defaults?: Partial<Record<string, string>> }) {
  const v = (k: keyof Tables<"marketing_items">) => (item ? ((item[k] as string | number | null) ?? "") : (defaults[k as string] ?? "")).toString();
  const planned = toLocal(item?.planned_at ?? null);
  return (
    <ActionForm action={saveMarketingItem} submitLabel={item ? "Salva" : "Crea"} hidden={{ id: item?.id, variants: item ? JSON.stringify(item.variants) : (defaults.variants ?? "[]") }}>
      {(s) => (<div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="mi-ti" label="Titolo" error={s.fieldErrors?.title}><Input id="mi-ti" name="title" defaultValue={v("title")} /></Field>
          <Field id="mi-ki" label="Tipo"><Select id="mi-ki" name="kind" defaultValue={v("kind") || "creativita"}>{opts(KINDS)}</Select></Field>
          <Field id="mi-ca" label="Campagna" optional><Select id="mi-ca" name="campaign_id" defaultValue={v("campaign_id")}><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field id="mi-st" label="Stato"><Select id="mi-st" name="status" defaultValue={v("status") || "bozza"}>{opts(MARKETING_STATUSES)}</Select></Field>
          <Field id="mi-au" label="Pubblico" optional><Select id="mi-au" name="audience" defaultValue={v("audience")}><option value="">—</option>{opts(AUDIENCES)}</Select></Field>
          <Field id="mi-ch" label="Canale" optional><Select id="mi-ch" name="channel" defaultValue={v("channel")}><option value="">—</option>{opts(CHANNELS)}</Select></Field>
          <Field id="mi-se" label="Servizio" optional><Select id="mi-se" name="service" defaultValue={v("service")}><option value="">—</option>{opts(SERVICES)}</Select></Field>
          <Field id="mi-ob" label="Obiettivo" optional><Select id="mi-ob" name="objective" defaultValue={v("objective")}><option value="">—</option>{opts(OBJECTIVES)}</Select></Field>
          <Field id="mi-fo" label="Formato" optional><Select id="mi-fo" name="format" defaultValue={v("format")}><option value="">—</option>{opts(FORMATS)}</Select></Field>
          <Field id="mi-to" label="Tono" optional><Select id="mi-to" name="tone" defaultValue={v("tone")}><option value="">—</option>{opts(TONES)}</Select></Field>
          <Field id="mi-pd" label="Data di pubblicazione prevista" optional><Input id="mi-pd" name="planned_on" type="date" defaultValue={planned.d || defaults.planned_on || ""} /></Field>
          <Field id="mi-pt" label="Ora prevista" optional><Input id="mi-pt" name="planned_time" type="time" defaultValue={planned.t} /></Field>
          <Field id="mi-du" label="Durata (secondi, per video)" optional><Input id="mi-du" name="duration_seconds" inputMode="numeric" defaultValue={v("duration_seconds")} /></Field>
        </div>
        <Field id="mi-ho" label="Hook iniziale" optional><Input id="mi-ho" name="hook" defaultValue={v("hook")} /></Field>
        <Field id="mi-he" label="Headline" optional><Input id="mi-he" name="headline" defaultValue={v("headline")} /></Field>
        <Field id="mi-bo" label="Testo / copy / script" optional><Textarea id="mi-bo" name="body" rows={5} defaultValue={v("body")} /></Field>
        <Field id="mi-ct" label="CTA" optional><Input id="mi-ct" name="cta" defaultValue={v("cta")} /></Field>
        <Field id="mi-vb" label="Brief visivo" optional><Textarea id="mi-vb" name="visual_brief" rows={3} defaultValue={v("visual_brief")} /></Field>
        <Field id="mi-gp" label="Prompt di generazione (Higgsfield o altro)" optional hint="Da eseguire manualmente nell'app Higgsfield: il connettore disponibile non genera contenuti."><Textarea id="mi-gp" name="generation_prompt" rows={3} defaultValue={v("generation_prompt")} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="mi-as" label="Asset (URL https o percorso /media/...)" optional><Input id="mi-as" name="asset_url" defaultValue={v("asset_url")} /></Field>
          <Field id="mi-ao" label="Origine dell'asset" optional error={s.fieldErrors?.asset_origin}><Select id="mi-ao" name="asset_origin" defaultValue={v("asset_origin")}><option value="">—</option>{opts(ASSET_ORIGINS)}</Select></Field>
        </div>
        <Field id="mi-ar" label="Diritti d'uso dell'asset" optional hint="Es. generato dal fondatore su Higgsfield il 20/11/2026, uso commerciale consentito dal piano."><Input id="mi-ar" name="asset_rights_note" defaultValue={v("asset_rights_note")} /></Field>
        <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">Solo se già pubblicato davvero</legend>
          <Field id="mi-po" label="Data di pubblicazione reale" optional><Input id="mi-po" name="published_on" type="date" defaultValue={item?.published_at?.slice(0, 10) ?? ""} /></Field>
          <Field id="mi-pu" label="Link al contenuto pubblicato" optional><Input id="mi-pu" name="published_url" type="url" defaultValue={v("published_url")} /></Field>
        </fieldset>
        <Field id="mi-no" label="Note" optional><Textarea id="mi-no" name="notes" rows={2} defaultValue={v("notes")} /></Field>
      </div>)}
    </ActionForm>
  );
}

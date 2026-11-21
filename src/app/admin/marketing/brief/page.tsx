import type { Metadata } from "next";
import { Alert, Card } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/simple";
import { MarketingItemForm, MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCES, CHANNELS, FORMATS, OBJECTIVES, SERVICES, TONES, generateBrief, type BriefInput } from "@/lib/marketing/brief";

export const metadata: Metadata = { title: "Generatore di brief e copy", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;
const pick = <T extends Record<string, string>>(o: T, v: unknown, d: keyof T): keyof T => (typeof v === "string" && v in o ? (v as keyof T) : d);

export default function BriefPage(props: PageProps<"/admin/marketing/brief">) {
  return <AdminPage title="Generatore di brief e copy" description="Modelli scritti dal team, non intelligenza artificiale e non basati su dati di performance: il risultato è un punto di partenza da modificare, approvare e testare."><MarketingTabs current="brief" /><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("marketing.manage", "/admin/marketing/brief");
  const sp = await searchParams;
  const input: BriefInput = {
    audience: pick(AUDIENCES, sp.pubblico, "neopatentati") as BriefInput["audience"], service: pick(SERVICES, sp.servizio, "neopatentati") as BriefInput["service"],
    objective: pick(OBJECTIVES, sp.obiettivo, "traffico") as BriefInput["objective"], channel: pick(CHANNELS, sp.canale, "instagram") as BriefInput["channel"],
    format: pick(FORMATS, sp.formato, "reel") as BriefInput["format"], tone: pick(TONES, sp.tono, "rassicurante") as BriefInput["tone"],
  };
  const generated = typeof sp.genera === "string";
  const out = generated ? generateBrief(input) : null;
  const supabase = await createClient();
  const { data: campaigns } = await supabase.from("marketing_campaigns").select("id, name").order("name");
  const sel = (name: string, label: string, o: Record<string, string>, v: string) => (
    <Field id={`b-${name}`} label={label}><Select id={`b-${name}`} name={name} defaultValue={v}>{Object.entries(o).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="p-5 lg:self-start">
        <form method="get" className="grid gap-3">
          <input type="hidden" name="genera" value="1" />
          {sel("pubblico", "Pubblico", AUDIENCES, input.audience)}
          {sel("servizio", "Servizio", SERVICES, input.service)}
          {sel("obiettivo", "Obiettivo", OBJECTIVES, input.objective)}
          {sel("canale", "Canale", CHANNELS, input.channel)}
          {sel("formato", "Formato", FORMATS, input.format)}
          {sel("tono", "Tono", TONES, input.tone)}
          <Button type="submit">Genera brief</Button>
        </form>
      </Card>
      <div className="flex flex-col gap-4">
        {!out ? <Alert tone="info">Scegli i parametri e premi «Genera brief». Potrai modificare ogni campo e salvarlo come contenuto in bozza.</Alert> : (
          <>
            <Card className="p-5 text-sm">
              <h2 className="mb-2 font-bold">Idea creativa</h2><p>{out.idea}</p>
              <h3 className="mt-3 font-semibold">Script</h3><pre className="whitespace-pre-wrap font-sans">{out.script}</pre>
              <h3 className="mt-3 font-semibold">Varianti da testare</h3>
              <ul>{out.variants.map((v) => <li key={v.label}><strong>{v.label}</strong>: {v.headline} — CTA «{v.cta}»</li>)}</ul>
            </Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Modifica e salva come contenuto</h2>
              <MarketingItemForm campaigns={campaigns ?? []} defaults={{
                kind: "brief", title: `${AUDIENCES[input.audience]} · ${SERVICES[input.service]} · ${CHANNELS[input.channel]}`, audience: input.audience, service: input.service,
                objective: input.objective, channel: input.channel, format: input.format, tone: input.tone, hook: out.hook, headline: out.headline,
                body: `${out.body}\n\n— Script —\n${out.script}`, cta: out.cta, visual_brief: out.visual_brief, generation_prompt: out.generation_prompt,
                duration_seconds: out.duration_seconds ? String(out.duration_seconds) : "", variants: JSON.stringify(out.variants), status: "bozza",
              }} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

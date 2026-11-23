import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminSaveContent, adminUnpublishContent } from "@/lib/actions/admin";
import { CMS_FIELDS } from "@/config/cms";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Contenuti del sito", robots: { index: false } };
const PREVIEW: Record<string, string> = { "home.hero": "/", "home.announcement": "/", "home.neopatentati": "/", "site.contacts": "/contatti", "faq.neopatentati": "/auto-per-neopatentati", "faq.garages": "/garages", "faq.meccanici": "/meccanici", "faq.ricambi": "/ricambi" };

export default function ContentPage(props: PageProps<"/admin/contenuti">) {
  return <AdminPage title="Contenuti del sito" description="Modifica i testi senza toccare il codice. Solo testo semplice (niente HTML o script). Salva in bozza, controlla l'anteprima, poi pubblica."><Editor searchParams={props.searchParams} /></AdminPage>;
}

async function Editor({ searchParams }: { searchParams: PageProps<"/admin/contenuti">["searchParams"] }) {
  await requirePermission("content.manage", "/admin/contenuti");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_content_list");
  const rows = (data ?? []) as unknown as Tables<"site_content">[];
  const key = typeof sp.chiave === "string" && sp.chiave in CMS_FIELDS ? sp.chiave : "home.hero";
  const row = rows?.find((r) => r.key === key);
  const draft = (row?.draft ?? {}) as Record<string, string>;
  const published = (row?.published ?? null) as Record<string, string> | null;
  const { data: history } = await supabase.from("site_content_history").select("id, action, created_at").eq("key", key).order("created_at", { ascending: false }).limit(10);
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Contenuti" className="flex flex-col gap-1">
        {(rows ?? []).filter((r) => r.key in CMS_FIELDS).map((r) => (
          <Link key={r.key} href={`/admin/contenuti?chiave=${r.key}`} aria-current={r.key === key ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm ${r.key === key ? "bg-ink text-white" : "hover:bg-white"}`}>
            {r.label ?? r.key} {r.published ? <Badge tone="success" className="ml-1">Pubblicato</Badge> : <Badge tone="neutral" className="ml-1">Predefinito</Badge>}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="mb-1 font-bold">{row?.label ?? key}</h2>
          <p className="mb-4 text-sm text-muted">{published ? `Pubblicato il ${formatDateTime(row!.published_at)}` : "Non pubblicato: il sito mostra il testo predefinito."} {PREVIEW[key] && <Link className="underline" href={PREVIEW[key]} target="_blank">Apri la pagina</Link>}</p>
          <ActionForm action={adminSaveContent} submitLabel="Salva" hidden={{ key }}>
            {((s: FormState) => (<>
              {CMS_FIELDS[key].map((f) => (
                <Field key={f.name} id={`c-${f.name}`} label={f.label} hint={f.hint}>
                  {f.multiline ? <Textarea id={`c-${f.name}`} name={f.name} rows={3} defaultValue={s.values?.[f.name] ?? draft[f.name] ?? ""} maxLength={2000} /> : <Input id={`c-${f.name}`} name={f.name} defaultValue={draft[f.name] ?? ""} maxLength={2000} />}
                </Field>
              ))}
              <Field id="c-pub" label="Dopo il salvataggio"><Select id="c-pub" name="publish" defaultValue="0"><option value="0">Mantieni come bozza</option><option value="1">Pubblica subito</option></Select></Field>
            </>))(initialFormState)}
          </ActionForm>
          {published && <ActionForm action={adminUnpublishContent} submitLabel="Ritira la pubblicazione" size="sm" variant="outline" hidden={{ key }} confirm="Tornare ai testi predefiniti?" className="mt-3" />}
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 font-bold">Anteprima della bozza</h3>
          <dl className="grid gap-1 text-sm">{Object.entries(draft).map(([k, v]) => <div key={k}><dt className="text-muted">{CMS_FIELDS[key].find((f) => f.name === k)?.label ?? k}</dt><dd className="whitespace-pre-line">{v}</dd></div>)}</dl>
          {Object.keys(draft).length === 0 && <p className="text-sm text-muted">Bozza vuota.</p>}
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 font-bold">Storico modifiche</h3>
          <ul className="text-sm">{(history ?? []).map((h) => <li key={h.id} className="flex justify-between border-b border-line py-1"><span>{h.action}</span><span className="text-muted">{formatDateTime(h.created_at)}</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}

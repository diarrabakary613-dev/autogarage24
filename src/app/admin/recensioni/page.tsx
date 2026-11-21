import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminModerateReview } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderazione recensioni", robots: { index: false } };

export default function ReviewsAdminPage(props: PageProps<"/admin/recensioni">) {
  return <AdminPage title="Recensioni" description="Le recensioni nascono solo da interventi completati. Puoi nasconderle in caso di abuso, con motivazione registrata."><List searchParams={props.searchParams} /></AdminPage>;
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/recensioni">["searchParams"] }) {
  await requirePermission("reviews.moderate", "/admin/recensioni");
  const sp = await searchParams;
  const supabase = await createClient();
  const view = sp.vista === "tutte" ? "tutte" : sp.vista === "sospette" ? "sospette" : "segnalate";
  const reported = view === "segnalate";
  const text = typeof sp.q === "string" ? sp.q.replace(/[%,()]/g, " ").trim().slice(0, 60) : "";
  const st = typeof sp.stato === "string" && ["pubblicata", "in_moderazione", "nascosta"].includes(sp.stato) ? sp.stato : "";
  const kind = sp.tipo === "acquisto" || sp.tipo === "servizio" ? sp.tipo : "";
  const { data: reports } = await supabase.from("review_reports").select("review_id, reason, created_at").order("created_at", { ascending: false }).limit(200);
  const ids = [...new Set((reports ?? []).map((r) => r.review_id))];
  let q = supabase.from("reviews").select("*, professional_profiles(display_name)").order("created_at", { ascending: false }).limit(100);
  if (reported) q = ids.length ? q.in("id", ids) : q.eq("id", "00000000-0000-0000-0000-000000000000");
  if (view === "sospette") q = q.not("suspicious_reason", "is", null);
  if (text) q = q.or(`comment.ilike.%${text}%,title.ilike.%${text}%`);
  if (st) q = q.eq("status", st);
  if (kind) q = q.eq("review_kind", kind);
  const { data } = await q;
  const { data: history } = data?.length ? await supabase.from("review_history").select("review_id, field, old_value, new_value, note, created_at").in("review_id", data.map((r) => r.id)).order("created_at", { ascending: false }) : { data: [] };
  return (
    <>
      <div className="mb-3 flex gap-2">{[["segnalate", "Segnalate"], ["sospette", "Sospette"], ["tutte", "Tutte"]].map(([k, l]) => <Link key={k} href={`/admin/recensioni?vista=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${k === view ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{l}</Link>)}</div>
      <form method="get" className="mb-4 flex flex-wrap gap-2" role="search"><input type="hidden" name="vista" value={view} />
        <Input name="q" defaultValue={text} placeholder="Cerca nel testo" aria-label="Cerca" className="w-56" />
        <Select name="stato" defaultValue={st} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option><option value="pubblicata">Pubblicata</option><option value="in_moderazione">In moderazione</option><option value="nascosta">Nascosta</option></Select>
        <Select name="tipo" defaultValue={kind} aria-label="Tipo" className="w-auto"><option value="">Servizi e acquisti</option><option value="servizio">Servizio</option><option value="acquisto">Acquisto</option></Select>
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
      </form>
      <p className="mb-3 text-sm text-muted">Lo staff può solo cambiare lo stato con motivazione: testo e punteggi non sono modificabili da nessuno.</p>
      {!data?.length ? <EmptyState title="Nessuna recensione" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((r) => (
            <li key={r.id}><Card className="flex flex-col gap-2 p-4">
              <p className="font-bold">{r.rating}/5 · {(r.professional_profiles as unknown as { display_name: string } | null)?.display_name} <Badge tone={r.status === "pubblicata" ? "success" : "neutral"}>{r.status}</Badge></p>
              <p className="text-sm">{r.title ? <strong>{r.title} — </strong> : null}{r.comment}</p>
              <p className="text-xs text-muted">{formatDate(r.created_at)} · {r.review_kind === "acquisto" ? "acquisto confermato da entrambe le parti" : "intervento completato"}{r.reply ? " · con risposta" : ""}</p>
              {r.suspicious_reason && <p className="text-sm text-danger">Segnale automatico: {r.suspicious_reason}</p>}
              {(history ?? []).filter((h) => h.review_id === r.id).length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">Storico decisioni</summary><ul className="mt-1">{(history ?? []).filter((h) => h.review_id === r.id).map((h, i) => <li key={i}>{formatDate(h.created_at)} · {h.field === "status" ? `stato ${h.old_value} → ${h.new_value}` : "risposta modificata"}{h.note ? ` — ${h.note}` : ""}</li>)}</ul></details>}
              {(reports ?? []).filter((x) => x.review_id === r.id).map((x, i) => <p key={i} className="text-sm text-[#6e4000]">Segnalazione: {x.reason}</p>)}
              <ActionForm action={adminModerateReview} submitLabel="Applica" size="sm" hidden={{ id: r.id }}>
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <Field id={`s-${r.id}`} label="Stato"><Select id={`s-${r.id}`} name="status" defaultValue={r.status === "pubblicata" ? "nascosta" : "pubblicata"}><option value="pubblicata">Pubblicata</option><option value="in_moderazione">In moderazione</option><option value="nascosta">Nascosta</option></Select></Field>
                  <Field id={`n-${r.id}`} label="Motivazione"><Input id={`n-${r.id}`} name="note" maxLength={1000} /></Field>
                </div>
              </ActionForm>
            </Card></li>
          ))}
        </ul>
      )}
    </>
  );
}

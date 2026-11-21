import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { TranscriptForm } from "@/components/admin/transcript-form";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateReport } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Segnalazioni", robots: { index: false } };
const CAT: Record<string, string> = { annuncio_sospetto: "Annuncio sospetto", profilo_falso: "Profilo falso", foto_non_autorizzate: "Foto non autorizzate", truffa: "Truffa", comportamento_scorretto: "Comportamento scorretto", spam: "Spam", informazioni_ingannevoli: "Informazioni ingannevoli", contenuto_inappropriato: "Contenuto inappropriato", altro: "Altro" };
const LINK: Record<string, (id: string) => string> = { annuncio_auto: () => "/admin/moderazione?tab=auto&stato=pubblicato", ricambio: () => "/admin/moderazione?tab=ricambi&stato=pubblicato", profilo: () => "/admin/verifiche?stato=approvato", recensione: () => "/admin/recensioni" };

export default function ReportsPage(props: PageProps<"/admin/segnalazioni">) {
  return <AdminPage title="Segnalazioni" description="Ogni segnalazione va esaminata: nessuna sospensione automatica. Le decisioni restano nello storico."><List searchParams={props.searchParams} /></AdminPage>;
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/segnalazioni">["searchParams"] }) {
  const me = await requirePermission("reports.manage", "/admin/segnalazioni");
  const sp = await searchParams;
  const status = ["nuova", "in_esame", "risolta", "archiviata"].includes(String(sp.stato)) ? String(sp.stato) : "aperte";
  const supabase = await createClient();
  let q = supabase.from("content_reports").select("*").order("priority", { ascending: false }).order("created_at").limit(100);
  q = status === "aperte" ? q.in("status", ["nuova", "in_esame"]) : q.eq("status", status);
  const { data } = await q;
  const canRead = me.permissions.includes("conversations.moderate");
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">{[["aperte", "Aperte"], ["nuova", "Nuove"], ["in_esame", "In esame"], ["risolta", "Risolte"], ["archiviata", "Archiviate"]].map(([k, l]) => <Link key={k} href={`/admin/segnalazioni?stato=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${k === status ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{l}</Link>)}</div>
      {!data?.length ? <EmptyState title="Nessuna segnalazione" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((r) => (
            <li key={r.id}><Card className="flex flex-col gap-2 p-4">
              <p className="flex flex-wrap items-center gap-2 font-bold">{CAT[r.category]} <Badge tone={r.priority === "urgente" || r.priority === "alta" ? "danger" : "neutral"}>{r.priority}</Badge><Badge tone="neutral">{r.status.replace("_", " ")}</Badge></p>
              <p className="text-sm text-muted">{r.target_type.replace("_", " ")}: {r.target_label ?? r.target_id} · {formatDateTime(r.created_at)}{r.assigned_to ? " · assegnata" : ""}</p>
              <p className="text-sm whitespace-pre-line">{r.description}</p>
              {r.resolution && <p className="text-sm"><strong>Decisione:</strong> {r.resolution}</p>}
              {LINK[r.target_type] && <Link className="text-sm font-semibold text-orange-700 underline" href={LINK[r.target_type](r.target_id ?? "")}>Vai alla sezione di moderazione</Link>}
              {r.target_type === "messaggio" && r.target_id && canRead && <TranscriptForm conversationId={r.target_id} />}
              <ActionForm action={adminUpdateReport} submitLabel="Aggiorna" size="sm" hidden={{ id: r.id }}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field id={`s-${r.id}`} label="Stato"><Select id={`s-${r.id}`} name="status" defaultValue={r.status === "nuova" ? "in_esame" : r.status}><option value="in_esame">In esame</option><option value="risolta">Risolta</option><option value="archiviata">Archiviata</option></Select></Field>
                  <Field id={`p-${r.id}`} label="Priorità"><Select id={`p-${r.id}`} name="priority" defaultValue={r.priority}><option value="bassa">Bassa</option><option value="normale">Normale</option><option value="alta">Alta</option><option value="urgente">Urgente</option></Select></Field>
                  <Field id={`a-${r.id}`} label="Assegnazione"><Select id={`a-${r.id}`} name="assign" defaultValue="1"><option value="1">Assegna a me</option><option value="0">Non cambiare</option></Select></Field>
                  <Field id={`r-${r.id}`} label="Decisione / risoluzione" className="sm:col-span-3"><Textarea id={`r-${r.id}`} name="resolution" rows={2} defaultValue={r.resolution ?? ""} /></Field>
                </div>
              </ActionForm>
            </Card></li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">Per sospendere un account usa <Link className="underline" href="/admin/utenti">Utenti e ruoli</Link>, indicando la motivazione: l&apos;azione è registrata.</p>
    </>
  );
}

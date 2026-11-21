import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateTicket } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Assistenza clienti", robots: { index: false } };
const STATUS: Record<string, string> = { nuova: "Nuova", aperta: "Aperta", in_lavorazione: "In lavorazione", in_attesa_utente: "In attesa dell'utente", risolta: "Risolta", chiusa: "Chiusa" };

export default function SupportAdminPage(props: PageProps<"/admin/supporto">) {
  return <AdminPage title="Assistenza clienti" description="Prendendo in carico un ticket entri nella sua conversazione: rispondi all'utente da Messaggi."><List searchParams={props.searchParams} /></AdminPage>;
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/supporto">["searchParams"] }) {
  const me = await requirePermission("support.manage", "/admin/supporto");
  const sp = await searchParams;
  const open = sp.vista !== "chiusi";
  const supabase = await createClient();
  let q = supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(100);
  q = open ? q.not("status", "in", "(risolta,chiusa)") : q.in("status", ["risolta", "chiusa"]);
  const { data } = await q;
  const { data: users } = data?.length ? await supabase.from("profiles").select("id, email, full_name").in("id", data.map((t) => t.user_id)) : { data: [] };
  return (
    <>
      <div className="mb-4 flex gap-2">{[["aperti", "Aperti"], ["chiusi", "Risolti e chiusi"]].map(([k, l]) => <Link key={k} href={`/admin/supporto?vista=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${(k === "aperti") === open ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{l}</Link>)}</div>
      {!data?.length ? <EmptyState title="Nessun ticket" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((t) => { const u = users?.find((x) => x.id === t.user_id); return (
            <li key={t.id}><Card className="flex flex-col gap-2 p-4">
              <p className="flex flex-wrap items-center gap-2 font-bold">{t.subject} <Badge tone="neutral">{t.category}</Badge><Badge tone={t.status === "nuova" ? "orange" : "neutral"}>{STATUS[t.status]}</Badge>{t.assigned_to === me.id && <Badge tone="dark">Assegnato a te</Badge>}</p>
              <p className="text-sm text-muted">{u?.full_name ?? u?.email} · aggiornato {formatDateTime(t.updated_at)}</p>
              <div className="flex flex-wrap items-end gap-3">
                <ActionForm action={adminUpdateTicket} submitLabel="Aggiorna" size="sm" hidden={{ id: t.id }} className="flex-row! items-end gap-2">
                  <Field id={`s-${t.id}`} label="Stato"><Select id={`s-${t.id}`} name="status" defaultValue={t.status === "nuova" ? "in_lavorazione" : t.status}>{Object.entries(STATUS).filter(([k]) => k !== "nuova").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                  <Field id={`a-${t.id}`} label="Assegna"><Select id={`a-${t.id}`} name="assign" defaultValue={t.assigned_to ? "0" : "1"}><option value="1">A me (entro nella conversazione)</option><option value="0">Non cambiare</option></Select></Field>
                </ActionForm>
                {t.conversation_id && t.assigned_to === me.id && <Link className="text-sm font-semibold text-orange-700 underline" href={`/dashboard/messaggi/${t.conversation_id}`}>Rispondi</Link>}
              </div>
            </Card></li>); })}
        </ul>
      )}
    </>
  );
}

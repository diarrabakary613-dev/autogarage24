import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminProcessDeletion } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Privacy e cancellazioni", robots: { index: false } };

export default function GdprPage() {
  return <AdminPage title="Privacy e richieste di cancellazione" description="Gestisci le richieste entro 30 giorni. Prima di completare verifica obblighi di conservazione e contestazioni aperte."><List /></AdminPage>;
}

async function List() {
  await requirePermission("gdpr.manage", "/admin/gdpr");
  const supabase = await createClient();
  const { data } = await supabase.from("account_deletion_requests").select("*").order("created_at", { ascending: false }).limit(100);
  const { data: users } = data?.length ? await supabase.from("profiles").select("id, email").in("id", data.map((d) => d.user_id)) : { data: [] };
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning">«Completata» anonimizza il profilo, disattiva l&apos;account e rimuove contenuti personali secondo la procedura del database. L&apos;operazione non è reversibile: verifica prima che non ci siano obblighi di conservazione (fatture, contestazioni, richieste dell&apos;autorità).</Alert>
      {!data?.length ? <EmptyState title="Nessuna richiesta" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((r) => (
            <li key={r.id}><Card className="flex flex-col gap-2 p-4">
              <p className="font-bold">{users?.find((u) => u.id === r.user_id)?.email ?? "utente"} <Badge tone={r.status === "completata" ? "success" : r.status === "respinta" ? "danger" : "warning"}>{r.status.replace("_", " ")}</Badge></p>
              <p className="text-sm text-muted">Richiesta del {formatDate(r.created_at)}{r.processed_at ? ` · gestita il ${formatDate(r.processed_at)}` : ""}{r.reason ? ` · motivo: ${r.reason}` : ""}</p>
              {r.staff_note && <p className="text-sm">Nota: {r.staff_note}</p>}
              {(r.status === "ricevuta" || r.status === "in_lavorazione") && (
                <ActionForm action={adminProcessDeletion} submitLabel="Registra" size="sm" hidden={{ id: r.id }} confirm="Confermi l'operazione?">
                  <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                    <Field id={`d-${r.id}`} label="Decisione"><Select id={`d-${r.id}`} name="decision" defaultValue="in_lavorazione"><option value="in_lavorazione">In lavorazione</option><option value="completata">Completata (cancella)</option><option value="respinta">Respinta</option></Select></Field>
                    <Field id={`n-${r.id}`} label="Nota (obbligatoria)"><Input id={`n-${r.id}`} name="note" maxLength={1000} /></Field>
                  </div>
                </ActionForm>
              )}
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}

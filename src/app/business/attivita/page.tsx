import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { saveTask, setTaskStatus } from "@/lib/actions/business";
import { getBusinessContext } from "@/lib/business/context";
import { nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Attività" };
const KINDS: Record<string, string> = { rispondere: "Rispondere a una richiesta", richiamare: "Richiamare un cliente", preventivo: "Inviare un preventivo", confermare_appuntamento: "Confermare un appuntamento", aggiornare_annuncio: "Aggiornare un annuncio", rispondere_recensione: "Rispondere a una recensione", altro: "Altro" };

export default function TasksPage(props: PageProps<"/business/attivita">) {
  return (
    <>
      <PageHeader title="Attività" description="Promemoria del team con scadenza, priorità e assegnazione. Le notifiche usano il sistema esistente (in app, email e push secondo le preferenze)." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can, user } = await getBusinessContext("/business/attivita");
  if (!can("attivita")) return <Alert tone="info">Il tuo ruolo non include le attività.</Alert>;
  const sp = await searchParams;
  const mine = sp.mie === "1";
  let q = supabase.from("business_tasks").select("*").eq("profile_id", current.profile_id).order("status").order("due_at", { ascending: true, nullsFirst: false }).limit(200);
  if (mine) q = q.eq("assigned_to", user.id);
  const [{ data: tasks }, { data: members }] = await Promise.all([q, supabase.from("business_members").select("user_id, invite_email").eq("profile_id", current.profile_id).eq("status", "attivo")]);
  const now = nowMs();
  const who = (id: string | null) => (id ? members?.find((m) => m.user_id === id)?.invite_email ?? (id === user.id ? "te" : "titolare") : "nessuno");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 text-sm"><Link className={`rounded-full border px-3 py-1 ${!mine ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href="/business/attivita">Tutte</Link><Link className={`rounded-full border px-3 py-1 ${mine ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href="/business/attivita?mie=1">Assegnate a me</Link></div>
        {!tasks?.length ? <EmptyState title="Nessuna attività" /> : tasks.map((t) => {
          const late = t.status === "aperta" && t.due_at && new Date(t.due_at).getTime() < now;
          return (
            <Card key={t.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${t.status !== "aperta" ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <p className="font-bold">{t.title} {t.priority === "alta" && <Badge tone="danger">Alta</Badge>} {late && <Badge tone="warning">In ritardo</Badge>}</p>
                <p className="text-sm text-muted">{KINDS[t.kind]} · assegnata a {who(t.assigned_to)}{t.due_at ? ` · entro ${formatDateTime(t.due_at)}` : ""}</p>
                {t.description && <p className="text-sm">{t.description}</p>}
                {t.lead_source && t.lead_id && <Link className="text-sm underline" href={`/business/lead/dettaglio?fonte=${t.lead_source}&id=${t.lead_id}`}>Contatto collegato</Link>}
              </div>
              {t.status === "aperta" ? (
                <div className="flex gap-2"><ActionForm action={setTaskStatus} submitLabel="Completata" size="sm" hidden={{ id: t.id, status: "completata" }} /><ActionForm action={setTaskStatus} submitLabel="Annulla" size="sm" variant="ghost" hidden={{ id: t.id, status: "annullata" }} /></div>
              ) : <ActionForm action={setTaskStatus} submitLabel="Riapri" size="sm" variant="ghost" hidden={{ id: t.id, status: "aperta" }} />}
            </Card>
          );
        })}
      </div>
      <Card className="h-fit p-5">
        <h2 className="mb-3 font-bold">Nuova attività</h2>
        <ActionForm action={saveTask} submitLabel="Crea" hidden={{ profile_id: current.profile_id }} resetOnSuccess>
          {(s) => (<>
            <Field id="t" label="Titolo" error={s.fieldErrors?.title}><Input id="t" name="title" required maxLength={160} /></Field>
            <Field id="k" label="Tipo"><Select id="k" name="kind" defaultValue="altro">{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field id="p" label="Priorità"><Select id="p" name="priority" defaultValue="media"><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option></Select></Field>
            <Field id="d" label="Scadenza (ora di Milano)" optional><Input id="d" name="due_at" type="datetime-local" /></Field>
            {(members?.length ?? 0) > 0 && <Field id="a" label="Assegna a" optional><Select id="a" name="assigned_to" defaultValue=""><option value="">Me / titolare</option>{members!.map((m) => <option key={m.user_id!} value={m.user_id!}>{m.invite_email}</option>)}</Select></Field>}
            <Field id="ds" label="Dettagli" optional><Textarea id="ds" name="description" rows={2} maxLength={2000} /></Field>
          </>)}
        </ActionForm>
      </Card>
    </div>
  );
}

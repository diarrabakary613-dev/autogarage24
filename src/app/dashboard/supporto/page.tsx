import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { openTicket } from "@/lib/actions/messaging";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Assistenza clienti", robots: { index: false } };
const TICKET_CATEGORIES: Record<string, string> = { account: "Account", annunci: "Annunci", acquisto_vendita: "Acquisto e vendita", officine: "Officine", meccanici: "Meccanici", ricambi: "Ricambi", funzionamento: "Pagina e funzionamento", privacy: "Privacy", segnalazioni: "Segnalazioni", reclamo: "Reclamo", partner: "Supporto partner", altro: "Altro" };
const STATUS: Record<string, string> = { nuova: "Nuova", aperta: "Aperta", in_lavorazione: "In lavorazione", in_attesa_utente: "In attesa di tua risposta", risolta: "Risolta", chiusa: "Chiusa" };

export default function SupportPage() {
  return (
    <>
      <PageHeader title="Assistenza clienti" description="Scrivi al team di AutoGarage24. Ogni richiesta ha una conversazione dove puoi rispondere e allegare immagini o documenti." />
      <Suspense fallback={<Skeleton className="h-96" />}><Tickets /></Suspense>
    </>
  );
}

async function Tickets() {
  await requireUser("/dashboard/supporto");
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div>
        {!data?.length ? <EmptyState icon={<LifeBuoy className="size-6" aria-hidden />} title="Nessuna richiesta di assistenza" description="Se hai un problema con il sito, un annuncio o il tuo account, scrivici con il modulo." /> : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {data.map((t) => (
              <li key={t.id}>
                <Link href={t.conversation_id ? `/dashboard/messaggi/${t.conversation_id}` : "/dashboard/supporto"} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-mist">
                  <span><span className="block font-semibold">{t.subject}</span><span className="text-sm text-muted">{TICKET_CATEGORIES[t.category]} · aperta il {formatDate(t.created_at)}</span></span>
                  <Badge tone={t.status === "in_attesa_utente" ? "orange" : t.status === "risolta" || t.status === "chiusa" ? "success" : "neutral"}>{STATUS[t.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Nuova richiesta</h2>
        <ActionForm action={openTicket} submitLabel="Invia richiesta" resetOnSuccess>
          {(s) => (<>
            <Field id="tk-c" label="Categoria" error={s.fieldErrors?.category}><Select id="tk-c" name="category" defaultValue="">{[<option key="" value="" disabled>Scegli…</option>, ...Object.entries(TICKET_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)]}</Select></Field>
            <Field id="tk-s" label="Oggetto" error={s.fieldErrors?.subject}><Input id="tk-s" name="subject" maxLength={160} /></Field>
            <Field id="tk-m" label="Descrivi il problema" error={s.fieldErrors?.message} hint="Dopo l'invio potrai allegare immagini o documenti nella conversazione."><Textarea id="tk-m" name="message" rows={5} maxLength={4000} /></Field>
            {s.status === "success" && s.values?.conversation_id && <Link className="text-sm font-semibold text-orange-700 underline" href={`/dashboard/messaggi/${s.values.conversation_id}`}>Apri la conversazione</Link>}
          </>)}
        </ActionForm>
      </Card>
    </div>
  );
}

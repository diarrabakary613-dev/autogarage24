import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requestAccountDeletion } from "@/lib/actions/privacy";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Privacy e dati personali", robots: { index: false } };

export default function PrivacySettingsPage() {
  return (
    <>
      <PageHeader title="Privacy e dati personali" description="Scarica una copia dei tuoi dati, gestisci i consensi o chiedi la cancellazione dell'account." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  await requireUser("/dashboard/impostazioni/privacy");
  const supabase = await createClient();
  const { data: reqs } = await supabase.from("account_deletion_requests").select("id, status, created_at, processed_at").order("created_at", { ascending: false });
  const open = reqs?.find((r) => r.status === "ricevuta" || r.status === "in_lavorazione");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">Esporta i tuoi dati</h2>
        <p className="text-sm text-graphite">Un file JSON con profilo, ruoli, annunci, richieste, messaggi inviati, garage, manutenzione, preferenze e segnalazioni. I file caricati (foto, documenti) restano scaricabili dalle rispettive sezioni.</p>
        <a href="/api/account/export" className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white"><Download className="size-4" aria-hidden /> Scarica i miei dati</a>
      </Card>
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">Consensi</h2>
        <p className="text-sm text-graphite">Le comunicazioni promozionali sono facoltative e separate da quelle di servizio. Puoi modificarle in <Link className="font-semibold underline" href="/dashboard/impostazioni/notifiche">Preferenze notifiche</Link>.</p>
        <p className="text-sm text-graphite">Il sito usa solo cookie tecnici necessari all&apos;accesso; la mappa carica le immagini da OpenStreetMap. Dettagli nella <Link className="underline" href="/cookie">Cookie policy</Link> e nell&apos;<Link className="underline" href="/privacy">Informativa privacy</Link>.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-6 lg:col-span-2">
        <h2 className="text-lg font-bold">Cancellazione dell&apos;account</h2>
        {open ? (
          <Alert tone="info">Richiesta del {formatDate(open.created_at)}: <Badge tone="warning">{open.status.replace("_", " ")}</Badge></Alert>
        ) : (
          <>
            <p className="text-sm text-graphite">La richiesta viene gestita dal nostro team entro 30 giorni. Cancelleremo profilo, annunci, garage, documenti e preferenze. Alcuni dati possono essere conservati per il tempo previsto dalla legge (ad esempio registri di sicurezza, segnalazioni e contestazioni in corso) e poi eliminati. I messaggi inviati ad altri utenti possono restare visibili ai destinatari in forma anonima.</p>
            <ActionForm action={requestAccountDeletion} submitLabel="Chiedi la cancellazione" variant="danger" confirm="Confermi la richiesta di cancellazione?">
              {(s) => (<>
                <Field id="del-r" label="Motivo" optional><Textarea id="del-r" name="reason" rows={2} maxLength={1000} /></Field>
                <Checkbox id="del-c" name="confirm" label="Ho letto le informazioni sulla cancellazione e sulla conservazione dei dati." error={s.fieldErrors?.confirm} />
              </>)}
            </ActionForm>
          </>
        )}
        <p className="text-xs text-muted">Le pagine informative sono bozze in attesa di revisione legale: vedi docs/LAUNCH_CHECKLIST.md.</p>
      </Card>
    </div>
  );
}

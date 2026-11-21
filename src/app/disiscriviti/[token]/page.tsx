import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, Container, Skeleton } from "@/components/ui/feedback";
import { unsubscribeAction } from "@/lib/actions/growth-public";

export const metadata: Metadata = { title: "Disiscrizione dalle email promozionali", robots: { index: false, follow: false } };

export default function UnsubscribePage(props: PageProps<"/disiscriviti/[token]">) {
  return (
    <Container className="max-w-xl py-16">
      <Card className="p-6">
        <h1 className="text-2xl font-extrabold">Email promozionali</h1>
        <p className="mt-2 text-graphite">Conferma per non ricevere più email promozionali da AutoGarage24. Non serve accedere.</p>
        <Suspense fallback={<Skeleton className="mt-4 h-12" />}><Form params={props.params} /></Suspense>
        <p className="mt-4 text-sm text-muted">Puoi riattivarle quando vuoi da <Link className="underline" href="/dashboard/impostazioni/notifiche">Impostazioni › Notifiche</Link>.</p>
      </Card>
    </Container>
  );
}

async function Form({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ActionForm action={unsubscribeAction} submitLabel="Conferma la disiscrizione" pendingLabel="Un momento…" hidden={{ token }} className="mt-4" />;
}

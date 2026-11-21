import type { Metadata } from "next";
import { Suspense } from "react";
import { Star } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { replyToReview } from "@/lib/actions/requests";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Recensioni", robots: { index: false } };

export default function ReviewsPage() {
  return (
    <>
      <PageHeader title="Recensioni ricevute" description="Le recensioni arrivano solo da clienti con un intervento completato su AutoGarage24. Puoi rispondere una volta a ciascuna; per contenuti abusivi usa «Segnala» sulla pagina pubblica." />
      <Suspense fallback={<Skeleton className="h-96" />}><List /></Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/dashboard/recensioni");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id);
  const ids = (profiles ?? []).map((p) => p.id);
  const { data } = ids.length ? await supabase.from("reviews").select("*").in("profile_id", ids).order("created_at", { ascending: false }) : { data: [] };
  if (!data?.length) return <EmptyState icon={<Star className="size-6" aria-hidden />} title="Nessuna recensione ancora" description="Dopo un intervento completato, il cliente potrà lasciare una recensione." />;
  return (
    <ul className="flex flex-col gap-4">
      {data.map((r) => (
        <li key={r.id}>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{r.rating}/5 {r.title && `· ${r.title}`}</p>
              <Badge tone={r.status === "pubblicata" ? "success" : "neutral"}>{r.status}</Badge>
            </div>
            <p className="mt-2 text-graphite">{r.comment}</p>
            <p className="mt-1 text-xs text-muted">{formatDate(r.created_at)}{r.service_label ? ` · ${r.service_label}` : ""}</p>
            {r.reply ? <p className="mt-3 border-l-2 border-orange pl-3 text-sm"><strong>La tua risposta:</strong> {r.reply}</p> : r.status === "pubblicata" && (
              <ActionForm action={replyToReview} submitLabel="Pubblica risposta" size="sm" hidden={{ review_id: r.id }} className="mt-3">
                <Field id={`rp-${r.id}`} label="Risposta"><Textarea id={`rp-${r.id}`} name="reply" rows={2} maxLength={2000} /></Field>
              </ActionForm>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Card, Container, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { activateProfessional } from "@/lib/actions/professional";

type Kind = "officina" | "meccanico" | "venditore_ricambi";

/** Pagina di registrazione professionale: crea l'account o attiva il profilo per un utente già registrato. */
export function ProRegistration({ kind, title, intro, steps, path }: { kind: Kind; title: string; intro: string; steps: string[]; path: string }) {
  return (
    <div className="bg-mist pb-16">
      <Container className="py-10">
        <Breadcrumbs items={[{ name: "Professionisti", href: "/professionisti" }, { name: title, href: path }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <h1 className="text-4xl font-extrabold">{title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-graphite">{intro}</p>
            <ol className="mt-8 flex flex-col gap-3">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 rounded-xl border border-line bg-white p-4 shadow-card"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange font-bold text-ink">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted">L&apos;iscrizione è gratuita. Il profilo diventa pubblico solo dopo la verifica del team AutoGarage24; i badge di verifica compaiono solo dopo i controlli effettivi. I documenti caricati restano privati.</p>
          </div>
          <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}><Start kind={kind} path={path} /></Suspense>
        </div>
      </Container>
    </div>
  );
}

async function Start({ kind, path }: { kind: Kind; path: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-xl font-bold">Inizia la registrazione</h2>
        <p className="text-sm text-graphite">Crea l&apos;account dell&apos;attività: subito dopo potrai completare il profilo, anche in più momenti.</p>
        <ButtonLink href={`/registrati?ruolo=${kind}&next=/dashboard/profilo-professionale`} size="lg">Crea l&apos;account professionale</ButtonLink>
        <ButtonLink href={`/accedi?next=${encodeURIComponent(path)}`} variant="outline">Ho già un account</ButtonLink>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: existing } = await supabase.from("professional_profiles").select("id, review_status").eq("user_id", user.id).eq("professional_type", kind).is("deleted_at", null).maybeSingle();
  if (existing) {
    return (
      <Card className="flex flex-col gap-3 p-6">
        <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5 text-success" aria-hidden /> Hai già un profilo di questo tipo</p>
        <ButtonLink href={`/dashboard/profilo-professionale?profilo=${existing.id}`}>Riprendi la registrazione</ButtonLink>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <h2 className="mb-3 text-xl font-bold">Attiva il profilo professionale</h2>
      <ActionForm action={activateProfessional} submitLabel="Continua" hidden={{ kind }}>
        {(s) => <Field id="bn" label={kind === "meccanico" ? "Nome professionale" : "Nome dell'attività"} error={s.fieldErrors?.business_name} hint={kind === "meccanico" ? "Puoi usare nome e cognome o un nome commerciale." : undefined}><Input id="bn" name="business_name" maxLength={120} /></Field>}
      </ActionForm>
    </Card>
  );
}

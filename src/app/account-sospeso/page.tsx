import type { Metadata } from "next";
import { Alert, Container } from "@/components/ui/feedback";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account non attivo", robots: { index: false } };

export default function SuspendedAccountPage() {
  return (
    <Container className="max-w-lg py-16">
      <h1 className="mb-4 text-2xl font-extrabold">Il tuo account non è attivo</h1>
      <Alert tone="warning">
        L&apos;account è stato sospeso o disattivato dall&apos;amministrazione di AutoGarage24. Finché resta in
        questo stato non è possibile usare le funzioni riservate. Per chiarimenti contatta l&apos;assistenza
        indicando l&apos;email con cui ti sei registrato.
      </Alert>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Esci
        </Button>
      </form>
    </Container>
  );
}

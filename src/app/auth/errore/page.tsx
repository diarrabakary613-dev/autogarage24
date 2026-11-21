import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Container } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Link non valido", robots: { index: false } };

export default function AuthErrorPage() {
  return (
    <Container className="max-w-lg py-16">
      <h1 className="mb-4 text-2xl font-extrabold">Il link non è valido</h1>
      <Alert tone="warning">
        Il link potrebbe essere scaduto, già utilizzato o aperto in un browser diverso da quello usato per la
        richiesta. Per sicurezza, i link inviati via email funzionano una sola volta e per un tempo limitato.
      </Alert>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/accedi">Vai all&apos;accesso</ButtonLink>
        <ButtonLink href="/recupera-password" variant="outline">
          Richiedi un nuovo link
        </ButtonLink>
      </div>
    </Container>
  );
}

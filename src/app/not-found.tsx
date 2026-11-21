import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/feedback";

export default function NotFound() {
  return (
    <Container className="flex max-w-xl flex-col items-start gap-4 py-20">
      <p className="font-display text-6xl font-extrabold text-orange">404</p>
      <h1 className="text-2xl font-extrabold">Pagina non trovata</h1>
      <p className="text-muted">La pagina che cerchi non esiste o non è accessibile con il tuo account.</p>
      <ButtonLink href="/">Torna alla home</ButtonLink>
    </Container>
  );
}

import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Cookie Policy", robots: { index: false } };

export default function CookiePage() {
  return (
    <LegalDraft title="Cookie Policy">
      <p>
        In questa fase AutoGarage24 utilizza esclusivamente cookie tecnici necessari al funzionamento del
        servizio, in particolare i cookie di sessione che mantengono l&apos;accesso al proprio account.
      </p>
      <p>
        Non sono attivi cookie di profilazione né strumenti di analisi di terze parti. I caratteri tipografici
        sono serviti direttamente dal nostro sito, senza richieste a servizi esterni.
      </p>
      <p>
        Se in futuro verranno introdotti cookie non tecnici, saranno attivati solo previo consenso tramite un
        apposito banner di gestione delle preferenze.
      </p>
    </LegalDraft>
  );
}

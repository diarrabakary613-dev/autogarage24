import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Termini e condizioni", robots: { index: false } };

export default function TermsPage() {
  return (
    <LegalDraft title="Termini e condizioni">
      <h2>Ruolo della piattaforma</h2>
      <p>
        AutoGarage24 è una piattaforma che mette in contatto utenti, professionisti e venditori. Non vende
        direttamente veicoli o ricambi, non esegue interventi di riparazione e non è parte dei contratti
        conclusi tra utenti e professionisti.
      </p>
      <h2>Nessuna garanzia sui veicoli</h2>
      <p>
        AutoGarage24 non garantisce le automobili, i ricambi o gli interventi offerti dai professionisti, salvo
        servizi specifici che lo prevedano espressamente per contratto. Le informazioni degli annunci sono
        fornite dai venditori.
      </p>
      <h2>Account e verifiche</h2>
      <p>
        I badge di verifica indicano esclusivamente che il controllo descritto è stato eseguito
        dall&apos;amministrazione alla data indicata. Gli account che violano le regole della piattaforma
        possono essere sospesi.
      </p>
    </LegalDraft>
  );
}

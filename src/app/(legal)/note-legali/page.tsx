import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Informazioni legali", robots: { index: false } };

export default function LegalNoticePage() {
  return (
    <LegalDraft title="Informazioni legali">
      <h2>Titolare del sito</h2>
      <p>
        Ragione sociale, sede legale, partita IVA, numero di iscrizione al Registro delle Imprese e indirizzo PEC
        del gestore di AutoGarage24 saranno indicati qui prima del lancio pubblico, come previsto dalla normativa
        italiana per i siti con finalità commerciali.
      </p>
      <h2>Marchi citati</h2>
      <p>
        I marchi automobilistici citati sul sito appartengono ai rispettivi proprietari. Sono utilizzati solo per
        descrivere i veicoli e come criterio di ricerca, senza alcuna affiliazione, sponsorizzazione o partnership
        con i produttori.
      </p>
      <h2>Contenuti degli annunci</h2>
      <p>
        Le informazioni degli annunci e dei profili professionali sono fornite da venditori e professionisti, che
        ne sono responsabili. AutoGarage24 modera i contenuti secondo le regole della piattaforma.
      </p>
    </LegalDraft>
  );
}

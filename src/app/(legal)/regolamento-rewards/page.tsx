import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Regolamento AutoGarage24 Rewards", robots: { index: false } };

/** Bozza tecnica: descrive il funzionamento implementato. Va validata da un consulente prima dell'attivazione. */
export default function RewardsRulesPage() {
  return (
    <LegalDraft title="Regolamento AutoGarage24 Rewards">
      <h2>Stato del programma</h2>
      <p>
        Il programma è disattivato finché AutoGarage24 non completa le verifiche fiscali e normative applicabili (in
        particolare la disciplina delle manifestazioni a premio, DPR 430/2001) e non pubblica la versione definitiva di
        questo regolamento. Fino ad allora non vengono assegnati punti né accettati riscatti.
      </p>
      <h2>Natura dei punti</h2>
      <p>
        I punti sono un riconoscimento di fedeltà senza valore monetario: non sono denaro, non sono convertibili in
        denaro, non sono cedibili ad altri utenti, non sono rimborsabili e non possono essere prelevati. Possono essere
        usati solo per i premi presenti nel catalogo.
      </p>
      <h2>Come si guadagnano</h2>
      <p>
        I punti sono assegnati solo per operazioni confermate da una parte attendibile: un servizio segnato come
        completato dal professionista, una revisione registrata dal centro, un trasporto confermato dopo la consegna, un
        acquisto confermato da entrambe le parti, un&apos;offerta segnata come utilizzata dal partner. Le richieste
        soltanto inviate non danno punti. Le recensioni non danno punti, in nessun caso. Ogni operazione dà punti una
        sola volta; se viene annullata, i punti vengono stornati.
      </p>
      <h2>Livelli</h2>
      <p>
        Il livello (Bronze, Silver, Gold, Platinum) dipende dai punti guadagnati nella finestra di tempo indicata
        nell&apos;area Rewards e può dare un bonus percentuale sulle attività idonee. Soglie e vantaggi possono essere
        aggiornati: le modifiche non tolgono punti già assegnati.
      </p>
      <h2>Scadenza</h2>
      <p>
        I punti guadagnati scadono dopo il periodo indicato nell&apos;area Rewards (impostazione iniziale: 24 mesi).
        I riscatti consumano per primi i punti più vicini alla scadenza. Ricevi un avviso nelle notifiche 30 giorni
        prima.
      </p>
      <h2>Premi e codici</h2>
      <p>
        I premi sono offerti dai partner e pubblicati dopo l&apos;approvazione dello staff. Il riscatto genera un codice
        personale, utilizzabile una sola volta presso il partner entro la data indicata. Un codice non ancora usato può
        essere annullato: i punti tornano nel saldo. Il premio è erogato dal partner, che ne è responsabile secondo le
        condizioni indicate.
      </p>
      <h2>Inviti</h2>
      <p>
        L&apos;invito è premiato solo dopo il primo servizio verificato della persona invitata (o dopo la verifica e la
        pubblicazione dell&apos;attività invitata). Auto-inviti, account multipli, email alias e altri abusi comportano
        il blocco del premio e possono portare alla revoca dei punti.
      </p>
      <h2>Revoca e rettifiche</h2>
      <p>
        In caso di errori o abusi lo staff può rettificare o revocare punti, sempre con una motivazione registrata e
        comunicata all&apos;utente nelle notifiche. Per contestazioni scrivi all&apos;assistenza dall&apos;area personale.
      </p>
    </LegalDraft>
  );
}

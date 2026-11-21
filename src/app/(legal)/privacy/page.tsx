import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Privacy Policy", robots: { index: false } };

export default function PrivacyPage() {
  return (
    <LegalDraft title="Privacy Policy">
      <p>
        AutoGarage24 tratta i dati personali nel rispetto del Regolamento (UE) 2016/679 (GDPR) e della normativa
        italiana applicabile.
      </p>
      <h2>Dati raccolti in questa fase</h2>
      <p>
        Per creare un account raccogliamo email, nome e cognome, tipo di account ed eventualmente il nome
        dell&apos;attività. Dati facoltativi come telefono, città e CAP sono inseriti dall&apos;utente nella
        propria area personale e non sono pubblici.
      </p>
      <h2>Consenso alle comunicazioni</h2>
      <p>
        Le comunicazioni promozionali vengono inviate solo a chi ha dato un consenso esplicito, revocabile in
        qualsiasi momento dalla propria area personale.
      </p>
      <h2>Diritti dell&apos;interessato</h2>
      <p>
        Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione: le modalità di esercizio
        saranno indicate nella versione definitiva di questo documento, insieme ai dati del titolare del
        trattamento.
      </p>
    </LegalDraft>
  );
}

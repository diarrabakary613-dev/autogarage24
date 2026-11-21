import { PhoneCall } from "lucide-react";

/** Avviso di emergenza: AutoGarage24 non sostituisce i servizi pubblici di soccorso. */
export function EmergencyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="flex flex-col gap-2 rounded-2xl border-2 border-danger bg-danger-50 p-4 text-sm" aria-label="Emergenze">
      <p className="flex items-center gap-2 text-base font-extrabold text-danger"><PhoneCall className="size-5" aria-hidden /> Feriti, incendio o pericolo? Chiama subito il 112</p>
      <a href="tel:112" className="inline-flex w-fit items-center gap-2 rounded-full bg-danger px-5 py-2.5 text-base font-bold text-white">Chiama il 112</a>
      {!compact && (
        <ul className="list-disc pl-5 text-graphite">
          <li>112 è il Numero Unico di Emergenza europeo: è gratuito e funziona anche senza credito.</li>
          <li>In autostrada usa le colonnine SOS o chiama il 112: sulla rete in concessione il soccorso è gestito dal concessionario.</li>
          <li>Accendi le luci di emergenza, indossa il giubbotto ad alta visibilità, posiziona il triangolo e mettiti al riparo oltre il guardrail.</li>
        </ul>
      )}
      <p className="text-xs text-graphite">AutoGarage24 è una piattaforma che mette in contatto automobilisti e operatori privati: non è un servizio di emergenza e non garantisce tempi di intervento.</p>
    </aside>
  );
}

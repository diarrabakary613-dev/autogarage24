import type { Metadata } from "next";
import { ProRegistration } from "@/components/professionals/registration";

export const metadata: Metadata = {
  title: "Registra il tuo garage o la tua officina",
  description: "Presenta la tua attività, i servizi e gli orari, e ricevi richieste di preventivo e appuntamento dai clienti della tua zona.",
  alternates: { canonical: "/professionisti/registrazione-garage" },
};

export default function Page() {
  return <ProRegistration kind="officina" title="Registra il tuo garage o la tua officina" intro="Presenta la tua attività, i servizi e gli orari, e ricevi richieste di preventivo e appuntamento dai clienti della tua zona." path="/professionisti/registrazione-garage" steps={["Crea l'account o accedi", "Completa il profilo: dati, servizi, orari, foto (puoi salvare e riprendere)", "Carica i documenti per la verifica, se richiesti", "Invia il profilo: il team lo verifica e lo pubblica"]} />;
}

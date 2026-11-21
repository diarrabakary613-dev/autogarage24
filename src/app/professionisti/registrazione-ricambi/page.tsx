import type { Metadata } from "next";
import { ProRegistration } from "@/components/professionals/registration";

export const metadata: Metadata = {
  title: "Vendi ricambi su AutoGarage24",
  description: "Crea il profilo commerciale, pubblica i tuoi ricambi con codici OEM e compatibilità e rispondi alle richieste dei clienti.",
  alternates: { canonical: "/professionisti/registrazione-ricambi" },
};

export default function Page() {
  return <ProRegistration kind="venditore_ricambi" title="Vendi ricambi su AutoGarage24" intro="Crea il profilo commerciale, pubblica i tuoi ricambi con codici OEM e compatibilità e rispondi alle richieste dei clienti." path="/professionisti/registrazione-ricambi" steps={["Crea l'account o accedi", "Completa il profilo: dati, servizi, orari, foto (puoi salvare e riprendere)", "Carica i documenti per la verifica, se richiesti", "Invia il profilo: il team lo verifica e lo pubblica"]} />;
}

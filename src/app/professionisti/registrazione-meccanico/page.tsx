import type { Metadata } from "next";
import { ProRegistration } from "@/components/professionals/registration";

export const metadata: Metadata = {
  title: "Diventa un professionista su AutoGarage24",
  description: "Presenta competenze, servizi e zone servite. Lavori in sede, presso un'officina partner o in mobilità? Indicalo nel profilo.",
  alternates: { canonical: "/professionisti/registrazione-meccanico" },
};

export default function Page() {
  return <ProRegistration kind="meccanico" title="Diventa un professionista su AutoGarage24" intro="Presenta competenze, servizi e zone servite. Lavori in sede, presso un'officina partner o in mobilità? Indicalo nel profilo." path="/professionisti/registrazione-meccanico" steps={["Crea l'account o accedi", "Completa il profilo: dati, servizi, orari, foto (puoi salvare e riprendere)", "Carica i documenti per la verifica, se richiesti", "Invia il profilo: il team lo verifica e lo pubblica"]} />;
}

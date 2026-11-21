import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { BadgeCheck, Car, ClipboardList, Inbox, KeyRound, LayoutDashboard, MessagesSquare, ShieldCheck, UserRound } from "lucide-react";
import { BETA_NOTE, CheckList, FaqList, FeatureGrid, FormSection, LandingHero, Steps } from "@/components/marketing/landing";
import { PartnerApplicationForm } from "@/components/partner/forms";
import { Alert } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/partner", {
  title: "AutoGarage24 Partner — per concessionari e venditori professionali",
  description: "Pubblica le tue automobili su AutoGarage24, ricevi richieste da acquirenti e neopatentati a Milano e provincia e gestisci il tuo profilo. Candidatura gratuita durante la Beta.",
  alternates: { canonical: "/partner" },
});
}

const FAQ = [
  { q: "Quanto costa?", a: "Durante la Beta la partecipazione è gratuita. Eventuali piani a pagamento futuri saranno comunicati in anticipo e attivati solo con il tuo consenso esplicito." },
  { q: "Chi pubblica le automobili?", a: "Tu, dalla tua area personale, con una procedura guidata in sei passaggi. Se lo preferisci, durante l'onboarding il nostro team ti aiuta a inserire i primi annunci con la tua autorizzazione documentata." },
  { q: "Come funziona l'etichetta «adatta ai neopatentati»?", a: "Non è dichiarata a mano: la piattaforma la calcola dai dati tecnici del veicolo secondo le regole del Codice della strada in vigore. Se mancano dati, l'auto risulta «da verificare»." },
  { q: "Garantite un numero di contatti o di vendite?", a: "No. AutoGarage24 offre visibilità e strumenti per gestire le richieste; i risultati dipendono dal mercato e dalle tue offerte." },
  { q: "Come vengono controllati gli annunci?", a: "Ogni annuncio viene esaminato dallo staff prima della pubblicazione: completezza dei dati, foto, dichiarazioni del venditore. Annunci non conformi vengono sospesi con motivazione." },
];

export default function PartnerPage() {
  return (
    <>
      <LandingHero
        eyebrow="AutoGarage24 Partner"
        title="Le tue auto, dove le cercano davvero."
        subtitle="AutoGarage24 è la piattaforma che riunisce auto usate, neopatentati, officine e ricambi a Milano. Per concessionari e venditori professionali: pubblica le tue automobili, ricevi richieste ordinate e gestisci il tuo profilo da un'unica area."
        crumbs={[{ name: "Partner", href: "/partner" }]}
        ctas={[{ href: "#candidatura", label: "Candidati come partner" }, { href: "#come-funziona", label: "Come funziona" }]}
        aside={<div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80"><p className="mb-3 font-bold text-white">Cosa ottieni</p><CheckList items={["Profilo professionale con i tuoi dati e la tua sede", "Annunci con galleria, scheda tecnica e verifica neopatentati", "Richieste di informazioni e appuntamenti in un unico posto", "Assistenza diretta durante la Beta"]} /></div>}
      />
      <FeatureGrid id="cos-e" eyebrow="Cos'è AutoGarage24" title="Un ecosistema unico per l'automobile" description="Chi cerca un'auto trova anche officine, meccanici e ricambi. Per te significa farti trovare da persone che stanno già decidendo." items={[
        { icon: Car, title: "Marketplace auto", text: "Ricerca con filtri completi, schede dettagliate, confronto tra modelli." },
        { icon: KeyRound, title: "Neopatentati", text: "Compatibilità calcolata dai dati del veicolo: un'informazione chiara per chi cerca la prima auto." },
        { icon: ShieldCheck, title: "Annunci controllati", text: "Ogni annuncio è verificato dallo staff prima di andare online." },
      ]} />
      <Steps id="come-funziona" eyebrow="Come funziona" title="Dalla candidatura alle prime richieste" steps={[
        { title: "Compili la candidatura", text: "Bastano due minuti con i dati della tua attività." },
        { title: "Verifichiamo i dati", text: "Ti contattiamo per conoscere l'attività e controllare le informazioni." },
        { title: "Ricevi le istruzioni", text: "Accesso, guida e, se vuoi, una sessione di configurazione con il team." },
        { title: "Completi il profilo", text: "Logo, descrizione, sede, orari e contatti pubblici." },
        { title: "Pubblichi le automobili", text: "Procedura guidata con foto, dati tecnici e dichiarazioni." },
        { title: "Ricevi richieste", text: "Informazioni e appuntamenti arrivano nella tua area e nei messaggi." },
      ]} />
      <FeatureGrid id="vantaggi" eyebrow="Gestione quotidiana" title="Tutto dalla tua area personale" tone="mist" columns={4} items={[
        { icon: ClipboardList, title: "Pubblicare", text: "Bozze, invio in revisione, modifica del prezzo, segna come venduta." },
        { icon: Inbox, title: "Ricevere richieste", text: "Ogni richiesta è collegata all'auto e ha uno stato chiaro." },
        { icon: MessagesSquare, title: "Rispondere", text: "Messaggi in tempo reale con l'acquirente, anche con allegati." },
        { icon: LayoutDashboard, title: "Gestire il profilo", text: "Dati pubblici, foto, servizi e verifica documentale." },
        { icon: BadgeCheck, title: "Badge verificati", text: "Assegnati solo dopo un controllo reale dei documenti." },
        { icon: UserRound, title: "Contatto con il team", text: "Un referente durante la Beta per dubbi e configurazione." },
      ]} />
      <FormSection id="candidatura" eyebrow="Candidatura" title="Diventa AutoGarage24 Partner" description="Ti ricontattiamo per telefono o email. Nessun costo durante la Beta." side={<Alert tone="info">{BETA_NOTE}</Alert>}>
        <PartnerApplicationForm program="partner_auto" types={["concessionario", "venditore_auto"]} showCars idPrefix="pa-auto" />
      </FormSection>
      <FaqList id="faq" title="Domande dei concessionari" items={FAQ} />
    </>
  );
}

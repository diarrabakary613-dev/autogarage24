/**
 * Generatore di brief e copy BASATO SU REGOLE (modelli scritti a mano).
 * Non usa dati di performance e non "ottimizza" nulla: è un punto di
 * partenza da modificare, approvare e testare.
 */
export const AUDIENCES = {
  neopatentati: "Neopatentati e famiglie",
  acquirenti: "Chi cerca un'auto usata",
  proprietari: "Proprietari di auto",
  officine: "Officine",
  meccanici: "Meccanici indipendenti",
  concessionari: "Concessionari e venditori",
  ricambi: "Venditori di ricambi",
  generale: "Pubblico generale",
} as const;
export type Audience = keyof typeof AUDIENCES;
/** Pubblici ammessi per le campagne (Fase 32): in più utenti inattivi e professionisti in generale. */
export const CAMPAIGN_AUDIENCES = { ...AUDIENCES, inattivi: "Utenti inattivi", professionisti: "Professionisti (tutti)" } as const;
export const CAMPAIGN_TARGETS = { utenti: "Utenti", partner: "Partner e professionisti" } as const;

export const SERVICES = {
  neopatentati: "Auto per neopatentati", auto_usate: "Auto usate", officine: "Officine", meccanici: "Meccanici",
  ricambi: "Ricambi", manutenzione: "Il mio Garage", partner: "Programma partner", piattaforma: "AutoGarage24 in generale",
} as const;
export const OBJECTIVES = { notorieta: "Notorietà", traffico: "Visite al sito", iscrizioni: "Iscrizioni alla Beta", candidature: "Candidature partner", richieste: "Richieste ai professionisti" } as const;
export const CHANNELS = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", google: "Google", email: "Email", whatsapp: "WhatsApp", sito: "Sito", offline: "Offline" } as const;
export const FORMATS = { reel: "Reel / video verticale 9:16", video_orizzontale: "Video orizzontale 16:9", post: "Post 1:1", carosello: "Carosello", storia: "Storia 9:16", banner: "Banner", testo: "Solo testo" } as const;
export const TONES = { rassicurante: "Rassicurante", diretto: "Diretto", professionale: "Professionale", giovane: "Giovane e semplice" } as const;

export const MARKETING_STATUSES = {
  bozza: "Bozza", in_preparazione: "In preparazione", da_approvare: "Da approvare", approvato: "Approvato", pubblicato: "Pubblicato", archiviato: "Archiviato",
} as const;

type Spec = { pain: string; promise: string; proof: string; cta: string; landing: string };
export const BY_AUDIENCE: Record<Audience, Spec> = {
  neopatentati: {
    pain: "Prima auto: tanti annunci e il dubbio se si possa guidare con la patente nuova.",
    promise: "La tua prima auto merita una scelta intelligente.",
    proof: "il calcolo della compatibilità segue le regole del Codice della strada, con le fonti indicate; i casi incerti risultano \"da verificare\"",
    cta: "Cerca la tua prima auto", landing: "/prima-auto",
  },
  acquirenti: {
    pain: "Confrontare auto usate e capire chi le vende richiede tempo.",
    promise: "Tutto il mondo dell'automobile. In un unico posto.",
    proof: "ogni annuncio viene controllato dallo staff prima della pubblicazione",
    cta: "Cerca un'auto", landing: "/auto-usate",
  },
  proprietari: {
    pain: "Trovare un'officina di fiducia e ricordare le scadenze è complicato.",
    promise: "La tua auto, le tue scadenze e i professionisti vicini a te, in un'unica app.",
    proof: "le recensioni sono possibili solo dopo un intervento richiesto e concluso sulla piattaforma",
    cta: "Trova un'officina", landing: "/trova-officina",
  },
  officine: {
    pain: "Farsi trovare dagli automobilisti della propria zona senza disperdere tempo.",
    promise: "Fai conoscere la tua attività a nuovi automobilisti con AutoGarage24.",
    proof: "richieste, preventivi e appuntamenti si gestiscono da un'unica area, senza costi durante la Beta",
    cta: "Diventa officina partner", landing: "/diventa-officina-partner",
  },
  meccanici: {
    pain: "Lavorare in autonomia senza una vetrina online curata.",
    promise: "Un profilo professionale con le tue zone e i tuoi servizi.",
    proof: "il tuo indirizzo resta privato se lavori a domicilio",
    cta: "Crea il tuo profilo", landing: "/diventa-partner",
  },
  concessionari: {
    pain: "Ricevere contatti seri per le auto in vendita.",
    promise: "Pubblica le tue auto dove le cercano anche i neopatentati.",
    proof: "la compatibilità per neopatentati viene calcolata dai dati del veicolo, non dichiarata a mano",
    cta: "Diventa concessionario partner", landing: "/diventa-concessionario-partner",
  },
  ricambi: {
    pain: "Far trovare il pezzo giusto a chi ha l'auto giusta.",
    promise: "Ricambi cercabili per codice OEM e per automobile.",
    proof: "la compatibilità è indicata in modo trasparente: verificata solo con codice o telaio",
    cta: "Pubblica i tuoi ricambi", landing: "/diventa-partner",
  },
  generale: {
    pain: "Auto, officine e ricambi sono sparsi su troppi siti diversi.",
    promise: "Tutto il mondo dell'automobile. In un unico posto.",
    proof: "solo partner e annunci reali, verificati dal team",
    cta: "Entra nella Beta", landing: "/milano",
  },
};

const HOOK_BY_TONE: Record<keyof typeof TONES, (s: Spec) => string> = {
  rassicurante: (s) => `${s.pain} Ci pensiamo insieme.`,
  diretto: (s) => s.promise,
  professionale: (s) => `${s.pain.replace(/\.$/, "")}? Ecco un modo più ordinato.`,
  giovane: (s) => `${s.pain.split(":")[0]}? Facciamola semplice.`,
};

export type BriefInput = { audience: Audience; service: keyof typeof SERVICES; objective: keyof typeof OBJECTIVES; channel: keyof typeof CHANNELS; format: keyof typeof FORMATS; tone: keyof typeof TONES };
export type BriefOutput = { idea: string; hook: string; script: string; body: string; headline: string; cta: string; visual_brief: string; generation_prompt: string; variants: { label: string; headline: string; cta: string }[]; duration_seconds: number | null };

const VIDEO = new Set(["reel", "video_orizzontale", "storia"]);

export function generateBrief(i: BriefInput): BriefOutput {
  const s = BY_AUDIENCE[i.audience];
  const service = SERVICES[i.service];
  const isVideo = VIDEO.has(i.format);
  const duration = isVideo ? (i.channel === "youtube" && i.format === "video_orizzontale" ? 30 : 15) : null;
  const hook = HOOK_BY_TONE[i.tone](s);
  const headline = s.promise;
  const cta = s.cta;
  const body = `${s.pain} Con AutoGarage24 (${service.toLowerCase()}) ${s.proof}. Beta a Milano e provincia. ${cta}.`;
  const script = isVideo
    ? [`0–3 s — Hook a schermo: "${hook}"`, `3–${duration! - 5} s — Mostra l'uso reale della piattaforma (${service}): ricerca, scheda, contatto. Testo: "${s.proof}".`, `${duration! - 5}–${duration} s — Logo AutoGarage24 + CTA "${cta}" + indirizzo autogarage24 (landing ${s.landing}).`].join("\n")
    : `Immagine singola: headline "${headline}", sotto una riga di supporto e il pulsante "${cta}".`;
  const ratio = i.format === "video_orizzontale" || i.format === "banner" ? "16:9" : i.format === "post" || i.format === "carosello" ? "1:1" : "9:16";
  const visual = `Stile premium, realistico, luce naturale, palette AutoGarage24 (nero #111318, grafite #252A32, accento arancione #F47B20 usato con parsimonia). Ambientazione: Milano reale (strade, cortili, officine pulite). Soggetto: ${subjectFor(i.audience)}. Nessun logo di case automobilistiche leggibile, nessuna targa leggibile, nessun volto riconoscibile di persone reali senza liberatoria. Spazio libero per il testo nel terzo superiore. Formato ${ratio}.`;
  const prompt = `${isVideo ? "Cinematic realistic video" : "Photorealistic image"}, ${ratio}, ${subjectEn(i.audience)}, Milan Italy urban setting, natural soft light, premium automotive commercial look, dark graphite tones with subtle orange accent, shallow depth of field, no visible car brand logos, no readable license plates, no text, no watermark${isVideo ? `, smooth slow camera movement, ${duration} seconds` : ""}.`;
  const variants = [
    { label: "A — promessa", headline, cta },
    { label: "B — problema", headline: s.pain, cta },
    { label: "C — prova", headline: capitalize(s.proof), cta: i.objective === "iscrizioni" ? "Entra nella Beta" : cta },
  ];
  return {
    idea: `${AUDIENCES[i.audience]} · ${service}: partire dal problema ("${s.pain}") e mostrare come AutoGarage24 lo rende gestibile, senza promettere risultati.`,
    hook, script, body, headline, cta, visual_brief: visual, generation_prompt: prompt, variants, duration_seconds: duration,
  };
}

function subjectFor(a: Audience) {
  return ({
    neopatentati: "un/una ragazzo/a appena patentato/a con un genitore che confronta auto su smartphone accanto a una citycar",
    acquirenti: "una persona che osserva un'auto usata in un piazzale ordinato",
    proprietari: "un automobilista che consulta le scadenze della propria auto sul telefono",
    officine: "un'officina ordinata con un tecnico al lavoro e un tablet con le richieste",
    meccanici: "un meccanico indipendente con furgone attrezzato in un cortile",
    concessionari: "un piccolo concessionario con alcune auto esposte e un venditore al computer",
    ricambi: "uno scaffale di ricambi ordinato con un operatore che legge un codice",
    generale: "una strada di Milano al tramonto con auto parcheggiate",
  } as const)[a];
}
function subjectEn(a: Audience) {
  return ({
    neopatentati: "young new driver and parent comparing small city cars on a smartphone",
    acquirenti: "person looking at a used car in a tidy car lot",
    proprietari: "car owner checking maintenance reminders on a phone next to their car",
    officine: "clean modern car repair workshop, technician working, tablet on bench",
    meccanici: "independent mechanic with equipped van in a courtyard",
    concessionari: "small car dealership showroom with a salesperson at a desk",
    ricambi: "organized auto parts shelves, operator reading a part code",
    generale: "Milan street at golden hour with parked cars",
  } as const)[a];
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

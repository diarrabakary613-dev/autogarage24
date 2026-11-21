/** Testi delle pagine Garages e Meccanici (Fasi 5–6). Nessun dato inventato: solo spiegazioni del servizio. */
export const GARAGES_PAGE = {
  title: "Trova il garage giusto per la tua auto.",
  description: "Scopri officine, centri assistenza e professionisti vicino a te. Confronta i servizi e richiedi un preventivo in pochi passaggi.",
  steps: [
    { title: "Cerca", text: "Filtra per città, CAP, servizio o marca trattata. Puoi usare la tua posizione, solo se lo scegli tu." },
    { title: "Confronta", text: "Servizi, orari, prezzi indicativi pubblicati dall'officina e recensioni di clienti con un intervento completato." },
    { title: "Richiedi", text: "Descrivi il problema, scegli la tua auto dal garage virtuale e allega fotografie: la richiesta arriva solo all'officina scelta." },
    { title: "Decidi", text: "Ricevi il preventivo, accettalo o rifiutalo, e concorda l'appuntamento: è confermato solo quando l'officina lo accetta." },
  ],
  pros: ["Profilo pubblico con servizi, orari e foto", "Richieste di preventivo e appuntamento in un'unica dashboard", "Recensioni solo da clienti con interventi completati", "Iscrizione gratuita, verifica del profilo da parte del nostro team"],
  faq: [
    { q: "Le officine sono verificate?", a: "Ogni profilo viene esaminato dal team prima della pubblicazione. Il badge «Attività verificata» compare solo quando abbiamo controllato i dati dell'attività: non è una certificazione della qualità del lavoro." },
    { q: "Quanto costa richiedere un preventivo?", a: "Nulla. AutoGarage24 non gestisce pagamenti: prezzo e condizioni li concordi direttamente con l'officina." },
    { q: "Come funzionano le recensioni?", a: "Si possono lasciare solo dopo un intervento completato tramite la piattaforma. Le recensioni possono essere segnalate e vengono moderate." },
    { q: "Un appuntamento richiesto è già confermato?", a: "No. La data indicata è una richiesta: diventa un appuntamento confermato solo con l'accettazione esplicita dell'officina." },
  ],
};

export const MECHANICS_PAGE = {
  title: "Trova il meccanico giusto per la tua auto.",
  description: "Scopri professionisti indipendenti, consulta le loro competenze e richiedi assistenza direttamente online.",
  steps: [
    { title: "Cerca", text: "Per specializzazione, zona servita e modalità: in sede, presso un'officina partner o con intervento mobile." },
    { title: "Valuta", text: "Competenze ed esperienza sono dichiarate dal professionista; le certificazioni compaiono solo se documentate e verificate." },
    { title: "Chiedi assistenza", text: "Descrivi sintomi e tempi, allega foto e indica la zona dell'intervento senza dover comunicare l'indirizzo." },
    { title: "Concorda", text: "Preventivo e data restano proposte finché non vengono accettate esplicitamente da entrambe le parti." },
  ],
  drivers: ["Professionisti con competenze dichiarate in modo trasparente", "Richieste e preventivi tracciati", "Recensioni solo dopo interventi completati"],
  pros: ["Presenta competenze, servizi e zone servite", "Ricevi richieste mirate", "Collega il profilo all'officina con cui collabori (con autorizzazione)", "Gestisci preventivi e appuntamenti"],
  faq: [
    { q: "Che differenza c'è tra meccanico e officina?", a: "L'officina è un'attività con sede e profilo aziendale; il meccanico indipendente offre i propri servizi individualmente, in sede, presso un'officina partner o in mobilità." },
    { q: "Le competenze sono certificate?", a: "No, salvo dove indicato: esperienza e specializzazioni sono dichiarate dal professionista. Le certificazioni sono mostrate come «verificate» solo dopo il controllo dei documenti da parte del nostro team." },
    { q: "Il meccanico può venire a casa mia?", a: "Solo se dichiara l'intervento mobile e la tua zona rientra in quella servita. Alcuni interventi richiedono comunque un'officina attrezzata." },
    { q: "La disponibilità mostrata è in tempo reale?", a: "No. Non mostriamo disponibilità in tempo reale: proponi una data e il professionista la conferma o ne propone un'altra." },
  ],
};

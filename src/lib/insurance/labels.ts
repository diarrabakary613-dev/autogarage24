export const COVERAGES: Record<string, { label: string; text: string }> = {
  rca: { label: "RC Auto", text: "Obbligatoria per circolare. Copre i danni che causi ad altre persone, veicoli o cose. Non copre i danni alla tua auto." },
  furto_incendio: { label: "Furto e incendio", text: "Rimborsa il valore dell'auto (o dei pezzi) in caso di furto, rapina o incendio, secondo le condizioni e le franchigie della polizza." },
  kasko: { label: "Kasko", text: "Copre i danni alla tua auto anche quando la colpa è tua o non c'è un responsabile. Esiste in forma completa o «collisione»." },
  eventi_atmosferici: { label: "Eventi atmosferici", text: "Grandine, alluvioni, trombe d'aria, caduta di alberi: copre i danni all'auto causati da fenomeni naturali." },
  assistenza_stradale: { label: "Assistenza stradale", text: "Traino, soccorso, auto sostitutiva e rientro in caso di guasto o incidente, con un numero dedicato." },
  tutela_legale: { label: "Tutela legale", text: "Spese legali e peritali per difenderti o far valere i tuoi diritti dopo un sinistro o una contestazione." },
  cristalli: { label: "Cristalli", text: "Riparazione o sostituzione di parabrezza, lunotto e finestrini, spesso con franchigia ridotta in centri convenzionati." },
  infortuni_conducente: { label: "Infortuni del conducente", text: "Indennizzo per le lesioni di chi guida, che l'RC auto non copre quando il conducente è responsabile." },
  altro: { label: "Altre garanzie", text: "Atti vandalici, eventi socio-politici, ritiro patente e altre garanzie accessorie offerte dai singoli prodotti." },
};
export const PARTNER_TYPES: Record<string, string> = { compagnia: "Compagnia assicurativa", agente: "Agente (RUI sez. A)", broker: "Broker (RUI sez. B)", comparatore: "Comparatore autorizzato", banca_intermediario: "Banca o intermediario (RUI sez. D)" };
export const RP_STATUS: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  inviata: { label: "Inviata", tone: "warning" }, in_lavorazione: { label: "In lavorazione", tone: "orange" }, preventivo_disponibile: { label: "Preventivo disponibile", tone: "success" },
  non_quotabile: { label: "Non quotabile", tone: "danger" }, ritirata: { label: "Ritirata", tone: "neutral" }, chiusa: { label: "Chiusa", tone: "dark" },
};
export const PROVINCES = ["AG","AL","AN","AO","AP","AQ","AR","AT","AV","BA","BG","BI","BL","BN","BO","BR","BS","BT","BZ","CA","CB","CE","CH","CL","CN","CO","CR","CS","CT","CZ","EN","FC","FE","FG","FI","FM","FR","GE","GO","GR","IM","IS","KR","LC","LE","LI","LO","LT","LU","MB","MC","ME","MI","MN","MO","MS","MT","NA","NO","NU","OR","PA","PC","PD","PE","PG","PI","PN","PO","PR","PT","PU","PV","PZ","RA","RC","RE","RG","RI","RM","RN","RO","SA","SI","SO","SP","SR","SS","SU","SV","TA","TE","TN","TO","TP","TR","TS","TV","UD","VA","VB","VC","VE","VI","VR","VT","VV"];

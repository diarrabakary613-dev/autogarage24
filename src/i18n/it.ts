/**
 * Testi dell'interfaccia in italiano (lingua principale).
 * Per aggiungere una lingua: creare un file con la stessa struttura
 * (es. en.ts) e registrarlo in src/i18n/index.ts.
 */
export const it = {
  brand: {
    name: "AutoGarage24",
    tagline: "Tutto il mondo dell'automobile. In un unico posto.",
  },
  nav: {
    home: "Home",
    login: "Accedi",
    register: "Registrati",
    dashboard: "La mia area",
    admin: "Amministrazione",
    logout: "Esci",
    openMenu: "Apri il menu",
    closeMenu: "Chiudi il menu",
    mainNavigation: "Navigazione principale",
  },
  auth: {
    loginTitle: "Accedi ad AutoGarage24",
    loginSubtitle: "Gestisci richieste, preferiti e la tua attività.",
    registerTitle: "Crea il tuo account",
    registerSubtitle: "Gratis, in meno di un minuto.",
    email: "Email",
    password: "Password",
    confirmPassword: "Conferma password",
    fullName: "Nome e cognome",
    businessName: "Nome dell'attività",
    accountType: "Che tipo di account vuoi creare?",
    forgotPassword: "Password dimenticata?",
    noAccount: "Non hai un account?",
    haveAccount: "Hai già un account?",
    submitLogin: "Accedi",
    submitRegister: "Crea account",
    resetTitle: "Recupera la password",
    resetSubtitle: "Ti invieremo un link per impostarne una nuova.",
    resetSubmit: "Invia il link",
    resetSent:
      "Se l'indirizzo è registrato, riceverai a breve un'email con il link per reimpostare la password.",
    updateTitle: "Imposta una nuova password",
    updateSubmit: "Salva la nuova password",
    invalidCredentials: "Email o password non corretti.",
    emailNotConfirmed: "Devi prima confermare la tua email: controlla la casella di posta.",
    signUpSuccess:
      "Registrazione quasi completata! Ti abbiamo inviato un'email: apri il link per confermare l'account.",
    genericError: "Si è verificato un problema. Riprova tra qualche istante.",
    rateLimited: "Troppi tentativi. Attendi qualche minuto e riprova.",
    passwordHint: "Almeno 10 caratteri, con lettere e numeri.",
    acceptTerms: "Accetto i Termini e condizioni e ho letto la Privacy Policy.",
    marketingConsent:
      "Desidero ricevere comunicazioni su novità e servizi di AutoGarage24 (facoltativo, revocabile in ogni momento).",
  },
  common: {
    loading: "Caricamento…",
    save: "Salva",
    saved: "Modifiche salvate.",
    cancel: "Annulla",
    required: "obbligatorio",
    optional: "facoltativo",
    backHome: "Torna alla home",
  },
} as const;

export type Dictionary = typeof it;

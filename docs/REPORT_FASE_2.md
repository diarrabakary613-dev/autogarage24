# Report Fase 2 — Homepage commerciale e pagine pubbliche

Data: 19 novembre 2026 · Stato: **completata, in attesa di approvazione**. La Fase 3 non è stata avviata.

## Vincoli rispettati
- Architettura, database, autenticazione, ruoli, RLS e funzioni della Fase 1 invariati.
- Nessuna migrazione modificata, nessuna nuova migrazione necessaria.
- Nessuna nuova dipendenza installata.
- Nessun link verso pagine inesistenti (verificato da test automatico e da crawler).
- Nessun contenuto inventato: annunci, professionisti, recensioni, prezzi, contatti e social compaiono solo se reali.

## Realizzato

### Homepage (`/`)
| # | Sezione | Note |
|---|---|---|
| 1 | Header completo | Barra superiore ("Attivi a Milano e provincia", "Sono un professionista"), menu con 7 voci e pagina attiva evidenziata, CTA "Cerco un servizio", Accedi/Registrati oppure La mia area, Amministrazione ed Esci in base al ruolo |
| 2 | Hero | Titolo, sottotitolo e CTA del brief; scorciatoie "Cosa cerchi?"; area media pronta per video (senza audio, in loop, con poster, pausa, alternativa statica per "riduci animazioni") — oggi mostra un'illustrazione originale |
| 3 | Logo marquee | Marchi in forma tipografica, scorrimento continuo, pausa con mouse e tastiera, statico con "riduci animazioni", nessuna immagine da caricare |
| 4 | Griglia marchi | 14 marchi cliccabili → `/auto-usate?marca=…` |
| 5 | AutoGarage24 Neopatentati | Sezione di massima evidenza (subito dopo la hero, a tutta larghezza in arancione), tre pilastri del servizio, CTA, area annunci con stato vuoto onesto |
| 6–10 | Garages, Meccanici, Auto usate, Ricambi, Manutenzione | Card con immagine, titolo, descrizione, vantaggi e CTA, nell'ordine di priorità del brief |
| 11 | Professionisti | "Ho un'officina", "Sono un meccanico indipendente", più i link per venditori di auto e di ricambi |
| 12 | Auto della rete | Stato vuoto che spiega che compariranno solo annunci autorizzati e verificati |
| 13 | Come funziona | 5 passaggi |
| 14 | Testimonianze | Componente pronto, **nascosto** finché non ci sono recensioni autentiche |
| 15 | Footer | Invito finale, servizi, chi siamo, contatti, registrazione professionisti, privacy, cookie, termini, informazioni legali; social e recapiti compaiono quando inseriti |

### Pagine dedicate
| Pagina | Contenuti reali | In attesa |
|---|---|---|
| `/auto-per-neopatentati` | Come funziona il servizio, approccio alla compatibilità normativa (senza numeri inventati), scheda Controllo AutoGarage24 con i 5 esiti, CTA venditori | Annunci e filtri (Fase 4) |
| `/auto-usate` | Filtro per marca funzionante (`?marca=`), stato del filtro, elenco funzioni del marketplace | Annunci (Fase 3) |
| `/garages` | Elenco **letto dal database** dei profili officina pubblicati | Profili pubblicati, ricerca, richieste (Fasi 5 e 7) |
| `/meccanici` | Elenco **letto dal database** dei profili meccanico pubblicati | Come sopra |
| `/ricambi` | 11 categorie del brief, regole sulla compatibilità | Annunci ricambi (Fase 6) |
| `/servizi-auto` | 13 categorie di servizi, collegamenti a officine e meccanici | Richieste di preventivo e appuntamento (Fase 7) |

Pagine aggiuntive, necessarie per i link del brief: `/professionisti`, `/chi-siamo`, `/contatti`, `/note-legali` (bozza).

### SEO
Title e description per pagina, URL canonici, Open Graph con immagine generata, `sitemap.xml`, `robots.txt` (aree riservate escluse), dati strutturati Organization/WebSite e BreadcrumbList, breadcrumb visibili. Non sono state create pagine locali vuote (es. `/garages/milano`): arriveranno quando ci saranno contenuti reali.

### Accessibilità e prestazioni
Contrasto WCAG AA su testi e pulsanti, focus visibile, link "Vai al contenuto", `aria-current` sul menu, rispetto di "riduci animazioni", nessuna immagine pesante (grafica SVG/CSS), font locali, pagine statiche dove possibile.

## Mancante / da fornire
1. **Fotografie e video** con diritti d'uso → `docs/MEDIA.md` spiega come inserirli in 5 minuti.
2. **Recapiti ufficiali, social, dati societari** → `src/config/site.ts` e pagina Informazioni legali.
3. **Logo definitivo**.
4. **Progetto Supabase**, per vedere officine e meccanici reali e provare gli account con email vere.
5. Funzioni operative delle fasi 3–9, dichiarate in ogni pagina come "In preparazione".

## Scelte da confermare
- **Testo nero sui pulsanti arancioni** (invece del bianco) per rispettare il contrasto minimo di accessibilità.
- **Neopatentati prima della griglia marchi** nella homepage, per dare la massima priorità al servizio.
- **Marchi solo testuali** finché non si verificano i diritti sui loghi.

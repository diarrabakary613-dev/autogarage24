# Dove modificare i contenuti

Fino a quando il pannello di amministrazione non gestirà i contenuti (Fase 9), i testi sono raccolti in pochi
file, separati dal codice grafico. Dopo ogni modifica: `npm run check` e poi `npm run build`.

| Cosa | File |
|---|---|
| Testi della homepage (hero, Neopatentati, professionisti, come funziona) | `src/content/home.ts` |
| Le sei aree di servizio (titoli, descrizioni, vantaggi, CTA) | `src/content/services.ts` |
| Testi delle pagine dedicate (Neopatentati, elenchi funzioni in arrivo) | `src/content/pages.ts` |
| Marchi del marquee e della griglia | `src/config/brands.ts` |
| Fotografie e video | `src/config/media.ts` (vedi MEDIA.md) |
| Email, telefono e profili social | `src/config/site.ts` (i campi vuoti non vengono mostrati) |
| Voci di menu e footer | `src/config/navigation.ts` |
| Pagine incluse nella sitemap | `src/config/seo.ts` |
| Testimonianze | `TESTIMONIALS` in `src/content/home.ts` — **solo recensioni autentiche** con il consenso dell'autore; finché l'elenco è vuoto la sezione non compare |

Un test automatico blocca la build dei controlli (`npm run check`) se un link del menu, del footer o di una CTA
punta a una pagina che non esiste.

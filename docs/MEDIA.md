# Fotografie, video e loghi

## Situazione attuale

Non sono ancora disponibili fotografie o video con **diritti d'uso verificati**. Per questo il sito usa
illustrazioni originali create appositamente per AutoGarage24 (disegni SVG e grafica CSS, nessun diritto di terzi):

- hero della homepage: illustrazione di un'auto stilizzata in movimento
- sezione Neopatentati: stessa illustrazione su sfondo scuro
- card dei servizi e pagine dedicate: riquadri grafici con icona

I **loghi ufficiali dei marchi** non sono usati: i marchi compaiono come testo (presentazione tipografica),
con la nota che sono citati solo come criterio di ricerca e senza affiliazioni.

## Come sostituire i segnaposto (5 minuti)

1. Copia i file nella cartella `public/media/` del progetto.
2. Apri `src/config/media.ts` e compila i campi, indicando sempre la licenza. Esempio:

```ts
heroVideo: {
  src: "/media/hero.mp4",
  srcWebm: "/media/hero.webm",      // facoltativo
  poster: "/media/hero-poster.jpg",
  license: "Riprese originali AutoGarage24, novembre 2026",
},
```

3. Ricostruisci il sito (`npm run build`).

## Requisiti consigliati

| Risorsa | Formato | Dimensioni |
|---|---|---|
| Video hero | MP4 H.264 senza audio (+ WebM facoltativo), 8–15 s, in loop | 1920×1080 o 1600×1200, max ~4 MB |
| Poster del video | JPG o WebP | stessa proporzione del video, max ~250 KB |
| Foto sezioni | JPG o WebP | almeno 1600 px di larghezza |

Il video parte automaticamente solo se il browser lo consente, è sempre senza audio, ha un pulsante di pausa e
viene sostituito dall'immagine poster per chi ha attivato "riduci animazioni".

## Fonti con diritti chiari

- Riprese e foto realizzate da te o da un fotografo con cessione dei diritti scritta (la soluzione migliore).
- Foto delle officine e delle auto della rete, con autorizzazione scritta dei proprietari.
- Archivi con licenza commerciale (es. Pexels/Unsplash): controlla la licenza di ogni file, evita marchi e targhe
  riconoscibili, e annota la fonte nel campo `license`.

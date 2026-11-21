/**
 * Fotografie e video del sito.
 *
 * Al momento NON ci sono risorse con diritti d'uso verificati, quindi ogni
 * valore è `null` e il sito mostra illustrazioni originali (create per
 * AutoGarage24, nessun diritto di terzi).
 *
 * Per sostituirle (vedi docs/MEDIA.md):
 *   1. copia il file in /public/media/ (es. public/media/hero.mp4)
 *   2. indica qui il percorso (es. "/media/hero.mp4") e la licenza
 *   3. riavvia o ricostruisci il sito
 */
export type MediaAsset = {
  src: string;
  alt: string;
  /** Provenienza e licenza: obbligatoria per tracciare i diritti d'uso. */
  license: string;
};

export type VideoAsset = {
  /** MP4 H.264, senza audio, max ~15 s e ~4 MB. */
  src: string;
  /** Versione WebM facoltativa (più leggera). */
  srcWebm?: string;
  /** Immagine mostrata prima del video e con "riduci animazioni" attivo. */
  poster: string;
  license: string;
};

export const MEDIA: {
  heroVideo: VideoAsset | null;
  heroImage: MediaAsset | null;
  neopatentatiImage: MediaAsset | null;
  sections: Partial<Record<"auto-usate" | "garages" | "meccanici" | "ricambi" | "servizi-auto", MediaAsset>>;
} = {
  heroVideo: null,
  heroImage: null,
  neopatentatiImage: null,
  sections: {},
};

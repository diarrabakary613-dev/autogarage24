/**
 * Utilità per i file su Supabase Storage.
 * Bucket pubblici: listing-images, listing-videos, business-media, avatars → URL diretti.
 * Bucket privati: message-attachments, vehicle-documents, verification-documents,
 * field-documents → solo URL firmati temporanei generati lato server.
 */
export const PUBLIC_BUCKETS = ["listing-images", "listing-videos", "business-media", "avatars", "blog-images"] as const;
export type PublicBucket = (typeof PUBLIC_BUCKETS)[number];

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_TYPES = ["application/pdf", ...IMAGE_TYPES] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function publicFileUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Controllo del file prima del caricamento (tipo e dimensione). */
/** Video brevi del problema, solo come allegati di richiesta (massimo 50 MB, limite del piano Supabase Free). */
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Limiti più bassi impostati su alcuni bucket (devono coincidere con storage.buckets.file_size_limit). */
const BUCKET_IMAGE_LIMIT: Record<string, number> = { avatars: 2 * 1024 * 1024, "business-media": 5 * 1024 * 1024 };

export function validateFile(file: { type: string; size: number }, kind: "image" | "document" | "media", bucket?: string): string | null {
  if (kind === "media" && (VIDEO_TYPES as readonly string[]).includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) return "Video troppo grande (massimo 50 MB).";
    return file.size === 0 ? "Il file è vuoto." : null;
  }
  const types: readonly string[] = kind === "image" ? IMAGE_TYPES : DOCUMENT_TYPES;
  const max = Math.min(kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES, (bucket && BUCKET_IMAGE_LIMIT[bucket]) || Infinity);
  if (!types.includes(file.type)) {
    return kind === "image" ? "Formato non supportato: usa JPG, PNG o WebP." : kind === "media" ? "Formato non supportato: usa foto (JPG, PNG, WebP), PDF o video (MP4, MOV, WebM)." : "Formato non supportato: usa PDF, JPG, PNG o WebP.";
  }
  if (file.size > max) return `File troppo grande (massimo ${Math.round(max / 1024 / 1024)} MB).`;
  if (file.size === 0) return "Il file è vuoto.";
  return null;
}

/** Percorso casuale e non indovinabile all'interno della cartella consentita. */
export function randomPath(folder: string, mime: string): string {
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp"
    : mime === "video/mp4" ? "mp4" : mime === "video/quicktime" ? "mov" : mime === "video/webm" ? "webm" : "jpg";
  return `${folder}/${crypto.randomUUID()}.${ext}`;
}

/** Il percorso appartiene alla cartella dell'utente? (difesa lato server) */
export function isOwnPath(path: string, folder: string): boolean {
  return path.startsWith(`${folder}/`) && !path.includes("..") && /^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp|pdf)$/.test(path);
}

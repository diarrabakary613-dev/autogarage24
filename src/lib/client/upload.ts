"use client";

import { createClient } from "@/lib/supabase/client";
import { randomPath, validateFile } from "@/lib/storage";

/**
 * Compressione nel browser prima del caricamento: lato lungo massimo 1920 px,
 * JPEG qualità 0,82. Se la compressione non riduce il file, si usa l'originale.
 */
export async function compressImage(file: File, maxSide = 1920, quality = 0.82): Promise<{ blob: Blob; type: string; width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return { blob: file, type: file.type };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, type: file.type };
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return { blob: file, type: file.type, width: w, height: h };
    return { blob, type: "image/jpeg", width: w, height: h };
  } catch {
    return { blob: file, type: file.type };
  }
}

/** Carica un file nella cartella indicata del bucket; restituisce il percorso o un errore leggibile. */
export async function uploadFile(
  bucket: string,
  folder: string,
  file: File,
  kind: "image" | "document" | "media",
): Promise<{ path?: string; error?: string; type?: string; size?: number; width?: number; height?: number }> {
  const invalid = validateFile(file, kind);
  if (invalid) return { error: `${file.name}: ${invalid}` };
  const { blob, type, width, height } = file.type.startsWith("image/") ? await compressImage(file) : { blob: file as Blob, type: file.type, width: undefined, height: undefined };
  const afterCompression = validateFile({ type, size: blob.size }, kind, bucket);
  if (afterCompression) return { error: `${file.name}: ${afterCompression}` };
  const path = randomPath(folder, type);
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (error) return { error: `${file.name}: caricamento non riuscito. Riprova.` };
  return { path, type, size: blob.size, width, height };
}

/** Invia uno o più allegati come messaggi nella conversazione (l'utente deve esserne partecipante). */
export async function sendAttachments(conversationId: string, files: File[], caption = "Allegato"): Promise<string[]> {
  const supabase = createClient();
  const errors: string[] = [];
  for (const file of files.slice(0, 6)) {
    const up = await uploadFile("message-attachments", conversationId, file, "media");
    if (up.error || !up.path) { errors.push(up.error ?? file.name); continue; }
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      body: caption,
      attachment_path: up.path,
      attachment_name: file.name.slice(0, 255),
      attachment_mime: up.type,
      attachment_size: up.size,
    });
    if (error) errors.push(`${file.name}: invio non riuscito.`);
  }
  return errors;
}

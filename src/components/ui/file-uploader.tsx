"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { uploadFile } from "@/lib/client/upload";
import { cn } from "@/lib/utils";

/**
 * Caricamento nella propria cartella di un bucket. Dopo l'upload:
 * - onUploaded (server action) registra il file, oppure
 * - name: aggiunge input nascosti con i percorsi al modulo che lo contiene.
 */
export function FileUploader({
  bucket, folder, kind, label, multiple = false, max = 6, name, onUploaded, accept,
}: {
  bucket: string; folder: string; kind: "image" | "document" | "media"; label: string; multiple?: boolean; max?: number; name?: string;
  onUploaded?: (path: string, fileName: string, size: number) => Promise<{ ok: boolean; error?: string }>; accept?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [paths, setPaths] = useState<{ path: string; name: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();
  async function onFiles(list: FileList | null) {
    if (!list) return;
    setBusy(true); setErrors([]);
    const errs: string[] = [];
    const added: { path: string; name: string }[] = [];
    for (const f of Array.from(list).slice(0, max)) {
      const up = await uploadFile(bucket, folder, f, kind);
      if (!up.path) { errs.push(up.error ?? f.name); continue; }
      if (onUploaded) {
        const r = await onUploaded(up.path, f.name, up.size ?? f.size);
        if (!r.ok) { errs.push(`${f.name}: ${r.error ?? "non salvato"}`); continue; }
      }
      added.push({ path: up.path, name: f.name });
    }
    setPaths((p) => [...p, ...added]);
    setErrors(errs);
    setBusy(false);
    if (onUploaded && added.length) router.refresh();
  }
  return (
    <div className="flex flex-col gap-2">
      <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-mist px-4 py-4 text-sm font-semibold hover:border-ink", busy && "pointer-events-none opacity-60")}>
        <Upload className="size-4" aria-hidden /> {busy ? "Caricamento…" : label}
        <input type="file" className="sr-only" multiple={multiple} accept={accept ?? (kind === "image" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp")} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      {name && paths.map((p) => <input key={p.path} type="hidden" name={name} value={p.path} />)}
      {paths.length > 0 && <p className="text-xs text-muted">Caricati: {paths.map((p) => p.name).join(", ")}</p>}
      {errors.length > 0 && <p role="alert" className="text-xs text-danger">{errors.join(" · ")}</p>}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/client/upload";
import { deleteListingImage, saveImageOrder } from "@/lib/actions/listings";
import { publicFileUrl } from "@/lib/storage";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export type ManagedImage = { id: string; storage_path: string; is_cover: boolean };
const MAX = 20;

/** Caricamento (con compressione), anteprima, rimozione, riordino e copertina. */
export function ImageManager({ listingId, userId, initial, onCountChange }: { listingId: string; userId: string; initial: ManagedImage[]; onCountChange?: (n: number) => void }) {
  const [images, setImages] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const update = (next: ManagedImage[]) => { setImages(next); onCountChange?.(next.length); };

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setErrors([]);
    setBusy(true);
    const files = Array.from(list).slice(0, MAX - images.length);
    const supabase = createClient();
    const added: ManagedImage[] = [];
    const errs: string[] = [];
    for (const f of files) {
      const up = await uploadFile("listing-images", userId, f, "image");
      if (!up.path) { errs.push(up.error ?? f.name); continue; }
      const { data, error } = await supabase.from("vehicle_images")
        .insert({ listing_id: listingId, storage_path: up.path, position: images.length + added.length, is_cover: images.length + added.length === 0, width: up.width, height: up.height })
        .select("id, storage_path, is_cover").single();
      if (error || !data) { errs.push(`${f.name}: salvataggio non riuscito.`); await supabase.storage.from("listing-images").remove([up.path]); continue; }
      added.push(data);
    }
    update([...images, ...added]);
    setErrors(errs);
    setBusy(false);
  }

  function persist(next: ManagedImage[], cover: string | null) {
    update(next.map((i) => ({ ...i, is_cover: i.id === (cover ?? next[0]?.id) })));
    start(async () => {
      const r = await saveImageOrder(listingId, next.map((i) => i.id), cover);
      if (!r.ok) setErrors([r.error ?? "Ordine non salvato."]);
    });
  }
  const move = (i: number, d: number) => {
    const next = [...images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    persist(next, images.find((x) => x.is_cover)?.id ?? null);
  };
  const remove = (id: string) => start(async () => {
    const r = await deleteListingImage(listingId, id);
    if (!r.ok) { setErrors([r.error ?? "Eliminazione non riuscita."]); return; }
    const next = images.filter((i) => i.id !== id);
    const cover = images.find((x) => x.is_cover && x.id !== id)?.id ?? next[0]?.id ?? null;
    persist(next, cover);
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Fino a {MAX} foto · JPG, PNG o WebP fino a 8 MB. Le immagini vengono ridimensionate e compresse prima del caricamento. La prima foto (stella) è la copertina.</p>
      {errors.length > 0 && <Alert tone="error">{errors.join(" · ")}</Alert>}
      <label className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-mist p-6 text-center hover:border-ink", (busy || images.length >= MAX) && "pointer-events-none opacity-60")}>
        <Upload className="size-6 text-muted" aria-hidden />
        <span className="font-semibold">{busy ? "Caricamento in corso…" : "Scegli le fotografie"}</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} disabled={busy || images.length >= MAX} />
      </label>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className={cn("overflow-hidden rounded-xl border-2 bg-white", img.is_cover ? "border-orange" : "border-line")}>
              <div className="relative aspect-[4/3] bg-mist">
                {publicFileUrl("listing-images", img.storage_path) && <Image src={publicFileUrl("listing-images", img.storage_path)!} alt={`Foto ${i + 1}`} fill sizes="200px" className="object-cover" />}
                {img.is_cover && <span className="absolute top-2 left-2 rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-ink">Copertina</span>}
              </div>
              <div className="flex items-center justify-between p-1.5">
                <button type="button" onClick={() => persist(images, img.id)} aria-label="Usa come copertina" className="grid size-9 place-items-center rounded-md hover:bg-mist"><Star className={cn("size-4", img.is_cover && "fill-orange text-orange")} aria-hidden /></button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta prima" className="grid size-9 place-items-center rounded-md hover:bg-mist disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Sposta dopo" className="grid size-9 place-items-center rounded-md hover:bg-mist disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
                <button type="button" onClick={() => remove(img.id)} aria-label="Elimina foto" className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-50"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

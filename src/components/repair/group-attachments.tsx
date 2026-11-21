"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { sendAttachments } from "@/lib/client/upload";

/** Foto o video del problema, inviati in un solo gesto a tutte le officine scelte (nelle rispettive conversazioni). */
export function GroupAttachments({ conversationIds }: { conversationIds: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setState("sending");
    const files = Array.from(list).slice(0, 4);
    const all: string[] = [];
    for (const c of conversationIds) all.push(...(await sendAttachments(c, files, "Foto o video del problema")));
    setErrors([...new Set(all)]);
    setState("done");
  }
  if (!conversationIds.length) return <p className="text-sm text-muted">Potrai aggiungere foto e video dopo aver scelto le officine.</p>;
  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm font-semibold hover:border-ink">
        <Paperclip className="size-4" aria-hidden /> {state === "sending" ? "Invio in corso…" : "Aggiungi foto o video (max 4, video fino a 50 MB)"}
        <input type="file" multiple className="sr-only" disabled={state === "sending"} accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      {state === "done" && !errors.length && <p className="text-sm text-success" role="status">File inviati a {conversationIds.length} {conversationIds.length === 1 ? "officina" : "officine"}.</p>}
      {errors.length > 0 && <Alert tone="warning">{errors.join(" · ")}</Alert>}
    </div>
  );
}

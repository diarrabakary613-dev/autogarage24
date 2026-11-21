"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, CheckCheck, Clock, FileText, Paperclip, Send, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/client/upload";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string; sender_id: string | null; kind: string; body: string; created_at: string;
  attachment_path: string | null; attachment_name: string | null; attachment_mime: string | null; attachment_size: number | null;
};
type Local = ChatMessage & { state?: "sending" | "error"; tempId?: string };
const PAGE = 30;

/**
 * Chat in tempo reale (Supabase Realtime, filtrata per conversazione: le RLS
 * garantiscono che arrivino solo messaggi visibili all'utente).
 * Stati mostrati: in invio, inviato, letto (solo se registrato), errore.
 * "Consegnato" non viene mostrato perché non è verificabile tecnicamente.
 */
export function ChatView({ conversationId, userId, initial, otherLastReadAt, names, closed, blocked }: {
  conversationId: string; userId: string; initial: ChatMessage[]; otherLastReadAt: string | null;
  names: Record<string, string>; closed: boolean; blocked: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Local[]>(initial);
  const [readAt, setReadAt] = useState(otherLastReadAt);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(initial.length >= PAGE);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requested = useRef(new Set<string>());

  const markRead = useCallback(() => { supabase.rpc("mark_conversation_read", { conversation_id: conversationId }).then(() => {}); }, [supabase, conversationId]);

  useEffect(() => {
    markRead();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.filter((x) => !(x.state && x.sender_id === m.sender_id && x.body === m.body)), m]));
        if (m.sender_id !== userId) markRead();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const p = payload.new as { user_id: string; last_read_at: string | null };
        if (p.user_id !== userId) setReadAt(p.last_read_at);
      })
      .subscribe((status) => setOnline(status === "SUBSCRIBED"));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", on);
    return () => { supabase.removeChannel(channel); window.removeEventListener("online", on); window.removeEventListener("offline", on); };
  }, [supabase, conversationId, userId, markRead]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  // URL firmati temporanei per gli allegati (bucket privato).
  useEffect(() => {
    const missing = messages.filter((m) => m.attachment_path && !requested.current.has(m.attachment_path)).map((m) => m.attachment_path!);
    if (!missing.length) return;
    missing.forEach((p) => requested.current.add(p));
    supabase.storage.from("message-attachments").createSignedUrls(missing, 600).then(({ data }) => {
      if (!data) return;
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) }));
    });
  }, [messages, supabase]);

  async function loadOlder() {
    const oldest = messages.find((m) => !m.state)?.created_at;
    if (!oldest) return;
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).lt("created_at", oldest).order("created_at", { ascending: false }).limit(PAGE);
    setHasMore((data?.length ?? 0) >= PAGE);
    setMessages((prev) => [...(data ?? []).reverse(), ...prev]);
  }

  async function send(body: string, attachment?: { path: string; name: string; mime: string; size: number }) {
    setError(null);
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Local = { id: tempId, tempId, sender_id: userId, kind: "testo", body, created_at: new Date().toISOString(), attachment_path: attachment?.path ?? null, attachment_name: attachment?.name ?? null, attachment_mime: attachment?.mime ?? null, attachment_size: attachment?.size ?? null, state: "sending" };
    setMessages((p) => [...p, optimistic]);
    const { data, error: e } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body, attachment_path: attachment?.path, attachment_name: attachment?.name, attachment_mime: attachment?.mime, attachment_size: attachment?.size }).select("*").single();
    if (e || !data) {
      setMessages((p) => p.map((m) => (m.id === tempId ? { ...m, state: "error" } : m)));
      setError(e?.code === "54000" ? "Stai inviando troppi messaggi: attendi un momento." : e?.message && /chiusa|bloccat|non è possibile/i.test(e.message) ? e.message : "Messaggio non inviato. Riprova.");
      return;
    }
    setMessages((p) => (p.some((m) => m.id === data.id) ? p.filter((m) => m.id !== tempId) : p.map((m) => (m.id === tempId ? data : m))));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await send(body.slice(0, 4000));
  }

  async function onFile(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const up = await uploadFile("message-attachments", conversationId, f, "media");
    if (!up.path) { setError(up.error ?? "Allegato non valido."); return; }
    await send("Allegato", { path: up.path, name: f.name.slice(0, 255), mime: up.type!, size: up.size! });
  }

  const disabled = closed || blocked;
  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {!online && <p className="flex items-center gap-2 bg-warning-50 px-4 py-2 text-sm text-[#6e4000]"><WifiOff className="size-4" aria-hidden /> Connessione in tempo reale non attiva: i nuovi messaggi compariranno ricaricando la pagina.</p>}
      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Messaggi">
        {hasMore && <div className="mb-4 text-center"><button type="button" onClick={loadOlder} className="text-sm font-semibold text-orange-700 hover:underline">Carica messaggi precedenti</button></div>}
        <ol className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            if (m.kind === "sistema" && !mine) {
              return <li key={m.id} className="mx-auto max-w-[90%] rounded-xl bg-mist px-3 py-2 text-sm whitespace-pre-line text-graphite">{m.body}</li>;
            }
            const read = mine && !m.state && readAt && readAt >= m.created_at;
            const url = m.attachment_path ? urls[m.attachment_path] : undefined;
            return (
              <li key={m.id} className={cn("flex max-w-[85%] flex-col gap-1", mine ? "self-end items-end" : "self-start items-start")}>
                {!mine && <span className="px-1 text-xs text-muted">{(m.sender_id && names[m.sender_id]) ?? "Utente"}</span>}
                <div className={cn("rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line break-words", mine ? "bg-ink text-white" : "bg-mist text-ink", m.state === "error" && "bg-danger-50 text-danger")}>
                  {m.attachment_path ? (
                    m.attachment_mime?.startsWith("image/") && url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={m.attachment_name ?? "Immagine allegata"} className="max-h-60 rounded-lg" /></a>
                      : m.attachment_mime?.startsWith("video/") && url
                      ? <video src={url} controls preload="metadata" className="max-h-72 max-w-full rounded-lg" aria-label={m.attachment_name ?? "Video allegato"} />
                      : <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline"><FileText className="size-4" aria-hidden />{m.attachment_name ?? "Documento"}</a>
                  ) : m.body}
                </div>
                <span className="flex items-center gap-1 px-1 text-[11px] text-muted">
                  {new Date(m.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {mine && (m.state === "sending" ? <><Clock className="size-3" aria-hidden /> In invio</> : m.state === "error" ? <><AlertCircle className="size-3" aria-hidden /> Errore</> : read ? <><CheckCheck className="size-3 text-orange-700" aria-hidden /> Letto</> : <><Check className="size-3" aria-hidden /> Inviato</>)}
                </span>
              </li>
            );
          })}
        </ol>
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className="border-t border-line bg-danger-50 px-4 py-2 text-sm text-danger">{error}</p>}
      {disabled ? (
        <p className="border-t border-line bg-mist px-4 py-3 text-sm text-muted">{closed ? "La conversazione è chiusa: la cronologia resta consultabile." : "Non è possibile inviare messaggi in questa conversazione."}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line p-3">
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Allega un file (PDF o immagine, max 10 MB)" className="grid size-11 shrink-0 place-items-center rounded-lg border border-line-strong hover:border-ink"><Paperclip className="size-5" aria-hidden /></button>
          <input ref={fileRef} type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(e) => { onFile(e.target.files); e.target.value = ""; }} />
          <label htmlFor="chat-input" className="sr-only">Scrivi un messaggio</label>
          <textarea id="chat-input" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Scrivi un messaggio…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
            className="max-h-40 min-h-11 flex-1 resize-y rounded-lg border border-line-strong px-3 py-2.5 text-base sm:text-sm" />
          <button type="submit" disabled={!text.trim()} aria-label="Invia" className="grid size-11 shrink-0 place-items-center rounded-lg bg-orange text-ink disabled:opacity-50"><Send className="size-5" aria-hidden /></button>
        </form>
      )}
    </div>
  );
}

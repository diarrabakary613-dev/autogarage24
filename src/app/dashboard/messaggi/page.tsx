import { publicFileUrl } from "@/lib/storage";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessagesSquare } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CONVERSATION_CONTEXT_LABELS } from "@/lib/labels";
import { relativeTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Messaggi", robots: { index: false } };

export default function MessagesPage(props: PageProps<"/dashboard/messaggi">) {
  return (
    <>
      <PageHeader title="Messaggi" description="Tutte le conversazioni con venditori, officine, meccanici, ricambisti e assistenza." />
      <Suspense fallback={<Skeleton className="h-96" />}><Inbox searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Inbox({ searchParams }: { searchParams: PageProps<"/dashboard/messaggi">["searchParams"] }) {
  const user = await requireUser("/dashboard/messaggi");
  const sp = await searchParams;
  const archived = sp.vista === "archiviate";
  const ctx = typeof sp.tipo === "string" && sp.tipo in CONVERSATION_CONTEXT_LABELS ? (sp.tipo as Enums<"conversation_context">) : null;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()]/g, " ").trim().slice(0, 60) : "";
  const supabase = await createClient();
  let query = supabase.from("conversation_participants")
    .select("conversation_id, last_read_at, archived_at, conversations!inner(id, subject, context, status, last_message_at, created_at)")
    .eq("user_id", user.id).order("conversations(last_message_at)", { ascending: false, nullsFirst: false }).limit(100);
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (ctx) query = query.eq("conversations.context", ctx);
  if (q) query = query.ilike("conversations.subject", `%${q}%`);
  const { data: rows } = await query;
  const ids = (rows ?? []).map((r) => r.conversation_id);
  // Ultimo messaggio, non letti e interlocutori: tre query per l'intera pagina (niente N+1).
  const [{ data: lastMsgs }, { data: parts }] = ids.length ? await Promise.all([
    supabase.from("messages").select("conversation_id, body, sender_id, created_at, attachment_path").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500),
    supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", user.id),
  ]) : [{ data: [] }, { data: [] }];
  const otherIds = [...new Set((parts ?? []).map((p) => p.user_id))];
  const [{ data: names }, { data: avatars }] = otherIds.length
    ? await Promise.all([supabase.rpc("counterpart_names", { user_ids: otherIds }), supabase.rpc("counterpart_avatars", { user_ids: otherIds })])
    : [{ data: [] }, { data: [] }];
  const avatarOf = new Map((avatars ?? []).map((a) => [a.user_id, publicFileUrl(a.bucket as "avatars" | "business-media", a.path)]));
  const firstOther = new Map<string, string>();
  for (const p of parts ?? []) if (!firstOther.has(p.conversation_id)) firstOther.set(p.conversation_id, p.user_id);
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.display_name]));
  const latest = new Map<string, NonNullable<typeof lastMsgs>[number]>();
  const unread = new Map<string, number>();
  const readAt = new Map((rows ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  for (const m of lastMsgs ?? []) {
    if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
    const r = readAt.get(m.conversation_id);
    if (m.sender_id !== user.id && (!r || m.created_at > r)) unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
  }
  const others = new Map<string, string[]>();
  for (const p of parts ?? []) others.set(p.conversation_id, [...(others.get(p.conversation_id) ?? []), nameOf.get(p.user_id) ?? "Utente"]);

  return (
    <>
      <TabLinks current={archived ? "archiviate" : "attive"} items={[{ key: "attive", label: "Attive", href: "/dashboard/messaggi" }, { key: "archiviate", label: "Archiviate", href: "/dashboard/messaggi?vista=archiviate" }]} />
      <form method="get" className="mb-4 flex flex-wrap gap-2" role="search">
        {archived && <input type="hidden" name="vista" value="archiviate" />}
        <Input name="q" defaultValue={q} placeholder="Cerca per oggetto" aria-label="Cerca conversazioni" className="w-56" />
        <Select name="tipo" defaultValue={ctx ?? ""} aria-label="Tipologia" className="w-auto"><option value="">Tutte le tipologie</option>{Object.entries(CONVERSATION_CONTEXT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
      </form>
      {!rows?.length ? <EmptyState icon={<MessagesSquare className="size-6" aria-hidden />} title="Nessuna conversazione" description="Le conversazioni nascono quando contatti un venditore o un professionista, o quando ricevi una richiesta." /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {rows.map((r) => {
            const c = r.conversations as unknown as { id: string; subject: string; context: Enums<"conversation_context">; status: string; last_message_at: string | null; created_at: string };
            const m = latest.get(r.conversation_id);
            const n = unread.get(r.conversation_id) ?? 0;
            const who = others.get(r.conversation_id)?.join(", ") ?? (c.context === "supporto" ? "Assistenza AutoGarage24" : "In attesa di risposta");
            return (
              <li key={r.conversation_id}>
                <Link href={`/dashboard/messaggi/${c.id}`} className="flex gap-3 p-4 hover:bg-mist">
                  {(() => { const url = avatarOf.get(firstOther.get(r.conversation_id) ?? ""); return url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={url} alt="" className="size-11 shrink-0 rounded-full object-cover" loading="lazy" />
                    : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-bold text-white" aria-hidden>{who.slice(0, 1).toUpperCase()}</span>; })()}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className={`truncate ${n ? "font-extrabold" : "font-semibold"}`}>{who}</span><span className="shrink-0 text-xs text-muted">{relativeTime(m?.created_at ?? c.last_message_at ?? c.created_at)}</span></span>
                    <span className="block truncate text-sm text-graphite">{c.subject}</span>
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm text-muted">{m ? (m.attachment_path ? "📎 Allegato" : m.body) : ""}</span>
                      <span className="flex shrink-0 gap-1"><Badge tone="neutral">{CONVERSATION_CONTEXT_LABELS[c.context]}</Badge>{c.status !== "aperta" && <Badge tone="neutral">Chiusa</Badge>}{n > 0 && <Badge tone="orange">{n} non {n === 1 ? "letto" : "letti"}</Badge>}</span></span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

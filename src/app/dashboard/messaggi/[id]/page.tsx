import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Skeleton } from "@/components/ui/feedback";
import { ChatView, type ChatMessage } from "@/components/messaging/chat-view";
import { ReportButton } from "@/components/reports/report-button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/actions/helpers";
import { blockUser, conversationAction } from "@/lib/actions/messaging";
import { CONVERSATION_CONTEXT_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Conversazione", robots: { index: false } };

export default function ConversationPage(props: PageProps<"/dashboard/messaggi/[id]">) {
  return <Suspense fallback={<Skeleton className="h-[600px]" />}><Conversation params={props.params} /></Suspense>;
}

async function Conversation({ params }: { params: PageProps<"/dashboard/messaggi/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/messaggi/${id}`);
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  // L'RLS restituisce la conversazione solo ai partecipanti: un ID altrui dà "non trovata".
  const { data: c } = await supabase.from("conversations")
    .select("id, subject, context, status, request_id, listing_id, professional_profile_id, vehicle_listings(slug, title), professional_profiles(slug, display_name, professional_type)")
    .eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: parts }, { data: msgs }, { data: blocks }] = await Promise.all([
    supabase.from("conversation_participants").select("user_id, last_read_at, archived_at").eq("conversation_id", id),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
  ]);
  const me = parts?.find((p) => p.user_id === user.id);
  const others = (parts ?? []).filter((p) => p.user_id !== user.id);
  const { data: names } = others.length ? await supabase.rpc("counterpart_names", { user_ids: others.map((o) => o.user_id) }) : { data: [] };
  const nameMap = Object.fromEntries((names ?? []).map((n) => [n.user_id, n.display_name]));
  const other = others[0];
  const blocked = Boolean(other && blocks?.some((b) => b.blocked_id === other.user_id));
  const listing = c.vehicle_listings as unknown as { slug: string; title: string } | null;
  const pro = c.professional_profiles as unknown as { slug: string; display_name: string; professional_type: string } | null;
  const proBase = pro ? (pro.professional_type === "officina" ? "/garages" : pro.professional_type === "meccanico" ? "/meccanici" : pro.professional_type === "venditore_ricambi" ? "/venditori-ricambi" : "/professionisti") : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/messaggi" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Messaggi</Link>
          <h1 className="mt-1 truncate text-xl font-extrabold">{other ? nameMap[other.user_id] ?? "Utente" : c.context === "supporto" ? "Assistenza AutoGarage24" : "Conversazione"}</h1>
          <p className="text-sm text-muted">
            Conversazione relativa a: {listing ? <Link className="font-semibold text-orange-700 hover:underline" href={`/auto/${listing.slug}`}>{listing.title} <ExternalLink className="inline size-3" aria-hidden /></Link> : pro ? <Link className="font-semibold text-orange-700 hover:underline" href={`${proBase}/${pro.slug}`}>{pro.display_name}</Link> : c.subject}
            {c.request_id && <> · <Link className="underline" href={`/dashboard/richieste/${c.request_id}`}>richiesta collegata</Link></>}
            {" · "}{CONVERSATION_CONTEXT_LABELS[c.context]}
          </p>
        </div>
        <details className="relative">
          <summary className="cursor-pointer rounded-md border border-line-strong bg-white px-3 py-2 text-sm font-semibold">Opzioni</summary>
          <div className="absolute right-0 z-20 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-line bg-white p-3 shadow-lift">
            <ActionForm action={conversationAction} submitLabel={me?.archived_at ? "Riporta tra le attive" : "Archivia"} size="sm" variant="outline" hidden={{ conversation_id: id, action: me?.archived_at ? "riattiva" : "archivia" }} />
            {c.status === "aperta" && <ActionForm action={conversationAction} submitLabel="Chiudi conversazione" size="sm" variant="outline" hidden={{ conversation_id: id, action: "chiudi" }} confirm="La cronologia resterà consultabile." />}
            {other && <ActionForm action={blockUser} submitLabel={blocked ? "Sblocca utente" : "Blocca utente"} size="sm" variant={blocked ? "outline" : "danger"} hidden={{ user_id: other.user_id, conversation_id: id, unblock: blocked ? "1" : undefined }} confirm={blocked ? undefined : "Bloccare questo utente?"} />}
            <ReportButton targetType="messaggio" targetId={id} targetLabel={`Conversazione: ${c.subject}`} returnTo={`/dashboard/messaggi/${id}`} />
          </div>
        </details>
      </div>
      <ChatView conversationId={id} userId={user.id} initial={((msgs ?? []) as ChatMessage[]).reverse()} otherLastReadAt={other?.last_read_at ?? null} names={nameMap} closed={c.status !== "aperta"} blocked={blocked} />
      <p className="text-xs text-muted">Per la tua sicurezza non condividere dati di pagamento in chat. Le conversazioni sono private: lo staff può accedervi solo in caso di segnalazione, con accesso motivato e registrato.</p>
    </div>
  );
}

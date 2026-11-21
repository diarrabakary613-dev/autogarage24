import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { Pagination, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS } from "@/lib/labels";
import { relativeTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

const PAGE = 20;
const GROUPS: Record<string, { label: string; kinds: Enums<"request_kind">[] }> = {
  tutte: { label: "Tutte", kinds: [] },
  auto: { label: "Automobili", kinds: ["info_auto", "appuntamento_auto"] },
  officine: { label: "Officine e meccanici", kinds: ["preventivo", "appuntamento", "assistenza"] },
  ricambi: { label: "Ricambi", kinds: ["info_ricambio", "preventivo_ricambio"] },
};

const STATUS_TONE: Partial<Record<Enums<"request_status">, "orange" | "success" | "danger" | "neutral" | "warning">> = {
  nuova: "orange", preventivo_inviato: "warning", appuntamento_proposto: "warning", accettata: "success", completata: "success", rifiutata: "danger", annullata: "neutral",
};

export async function RequestList({ searchParams, basePath = "/dashboard/richieste", fixedGroup }: { searchParams: Promise<Record<string, string | string[] | undefined>>; basePath?: string; fixedGroup?: keyof typeof GROUPS }) {
  const user = await requireUser(basePath);
  const sp = await searchParams;
  const tab = sp.tab === "ricevute" ? "ricevute" : "inviate";
  const group = fixedGroup ?? (typeof sp.tipo === "string" && sp.tipo in GROUPS ? sp.tipo : "tutte");
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();
  let q = supabase.from("requests")
    .select("id, kind, subject, status, created_at, updated_at, requester_id, recipient_id, pro:professional_profiles(display_name)", { count: "exact" })
    .eq(tab === "ricevute" ? "recipient_id" : "requester_id", user.id)
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (GROUPS[group].kinds.length) q = q.in("kind", GROUPS[group].kinds);
  const { data, count } = await q;
  const otherIds = [...new Set((data ?? []).map((r) => (tab === "ricevute" ? r.requester_id : r.recipient_id)).filter(Boolean))] as string[];
  const { data: names } = otherIds.length ? await supabase.rpc("counterpart_names", { user_ids: otherIds }) : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.display_name]));
  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams({ tab, ...(fixedGroup ? {} : { tipo: group }), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
    return `${basePath}?${p}`;
  };
  return (
    <>
      <TabLinks current={tab} items={[{ key: "inviate", label: "Inviate", href: `${basePath}?tab=inviate` }, { key: "ricevute", label: "Ricevute", href: `${basePath}?tab=ricevute` }]} />
      {!fixedGroup && (
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.entries(GROUPS).map(([k, g]) => (
            <Link key={k} href={href({ tipo: k })} aria-current={k === group ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${k === group ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{g.label}</Link>
          ))}
        </div>
      )}
      {!data?.length ? (
        <EmptyState icon={<Inbox className="size-6" aria-hidden />} title={tab === "ricevute" ? "Nessuna richiesta ricevuta" : "Nessuna richiesta inviata"} description={tab === "ricevute" ? "Quando un cliente ti contatterà, la richiesta comparirà qui." : "Puoi chiedere informazioni su un'automobile o un preventivo a un'officina, a un meccanico o a un venditore di ricambi."} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {data.map((r) => (
            <li key={r.id}>
              <Link href={`/dashboard/richieste/${r.id}`} className="flex flex-col gap-1 p-4 hover:bg-mist sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.subject}</p>
                  <p className="text-sm text-muted">
                    {REQUEST_KIND_LABELS[r.kind]} · {tab === "ricevute" ? `da ${nameOf.get(r.requester_id) ?? "utente"}` : `a ${(r.pro as { display_name: string } | null)?.display_name ?? nameOf.get(r.recipient_id ?? "") ?? "venditore"}`} · {relativeTime(r.updated_at)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => href({ pagina: p })} />
    </>
  );
}

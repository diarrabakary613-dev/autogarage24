import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Registro attività", robots: { index: false } };
const PAGE = 50;

export default function AuditPage(props: PageProps<"/admin/audit">) {
  return <AdminPage title="Registro delle operazioni amministrative" description="Elenco immutabile delle azioni importanti: chi, cosa, quando. Non contiene messaggi o documenti personali."><List searchParams={props.searchParams} /></AdminPage>;
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requirePermission("audit.view", "/admin/audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const action = typeof sp.azione === "string" ? sp.azione.replace(/[^a-z_.]/g, "").slice(0, 60) : "";
  const supabase = await createClient();
  let q = supabase.from("admin_audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (action) q = q.ilike("action", `${action}%`);
  const { data, count } = await q;
  const actors = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: people } = actors.length ? await supabase.from("profiles").select("id, email").in("id", actors) : { data: [] };
  return (
    <>
      <form method="get" className="mb-4 flex gap-2"><Input name="azione" defaultValue={action} placeholder="Filtra per azione (es. role, listing)" aria-label="Azione" className="w-72" /><button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button></form>
      {!data?.length ? <EmptyState title="Nessuna operazione registrata" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mist text-left"><tr><th scope="col" className="p-3">Quando</th><th scope="col" className="p-3">Chi</th><th scope="col" className="p-3">Azione</th><th scope="col" className="p-3">Oggetto</th><th scope="col" className="p-3">Dettagli</th></tr></thead>
            <tbody>{data.map((a) => <tr key={a.id} className="border-t border-line align-top"><td className="p-3 whitespace-nowrap">{formatDateTime(a.created_at)}</td><td className="p-3">{people?.find((p) => p.id === a.actor_id)?.email ?? "sistema"}</td><td className="p-3 font-mono text-xs">{a.action}</td><td className="p-3 text-xs">{a.target_table} {a.target_id?.slice(0, 8)}</td><td className="max-w-xs p-3 font-mono text-xs break-all">{JSON.stringify(a.details)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => `/admin/audit?pagina=${p}${action ? `&azione=${action}` : ""}`} />
    </>
  );
}

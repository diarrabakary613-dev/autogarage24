import type { Metadata } from "next";
import { Suspense } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { MaintenanceTabs } from "@/components/garage/maintenance-tabs";
import { DocumentUpload } from "@/components/garage/document-upload";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteDocument } from "@/lib/actions/garage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Documenti dell'auto", robots: { index: false } };
const CAT: Record<string, string> = { fattura: "Fattura", ricevuta: "Ricevuta", preventivo: "Preventivo", manutenzione: "Manutenzione", tecnico: "Tecnico", foto: "Foto", altro: "Altro" };

export default function DocumentsPage(props: PageProps<"/dashboard/documenti-auto">) {
  return (
    <>
      <PageHeader title="Documenti dell'auto" description="Archivio privato di fatture, ricevute e documenti. Solo tu puoi vederli; i collegamenti di apertura scadono dopo pochi minuti." />
      <MaintenanceTabs current="documenti" />
      <Suspense fallback={<Skeleton className="h-96" />}><Docs searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Docs({ searchParams }: { searchParams: PageProps<"/dashboard/documenti-auto">["searchParams"] }) {
  const user = await requireUser("/dashboard/documenti-auto");
  const sp = await searchParams;
  const supabase = await createClient();
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()]/g, " ").trim().slice(0, 60) : "";
  const cat = typeof sp.categoria === "string" && sp.categoria in CAT ? sp.categoria : "";
  const auto = typeof sp.auto === "string" && /^[0-9a-f-]{36}$/.test(sp.auto) ? sp.auto : "";
  const [{ data: vehicles }, { data: records }] = await Promise.all([
    supabase.from("user_vehicles").select("id, make, model").is("deleted_at", null),
    supabase.from("maintenance_records").select("id, title, performed_on, user_vehicle_id").order("performed_on", { ascending: false }).limit(100),
  ]);
  let dq = supabase.from("user_vehicle_documents").select("*").order("document_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(200);
  if (q) dq = dq.ilike("title", `%${q}%`);
  if (cat) dq = dq.eq("category", cat);
  if (auto) dq = dq.eq("user_vehicle_id", auto);
  const { data: docs } = await dq;
  // URL firmati temporanei (5 minuti) per anteprima e download: mai URL pubblici.
  const signed = new Map<string, { view: string; download: string }>();
  if (docs?.length) {
    const [view, dl] = await Promise.all([
      supabase.storage.from("vehicle-documents").createSignedUrls(docs.map((d) => d.storage_path), 300),
      supabase.storage.from("vehicle-documents").createSignedUrls(docs.map((d) => d.storage_path), 300, { download: true }),
    ]);
    docs.forEach((d, i) => { const v = view.data?.[i]?.signedUrl; const w = dl.data?.[i]?.signedUrl; if (v && w) signed.set(d.id, { view: v, download: w }); });
  }
  const vname = new Map((vehicles ?? []).map((v) => [v.id, `${v.make} ${v.model}`]));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-4">
        <form method="get" className="flex flex-wrap gap-2" role="search">
          <Input name="q" defaultValue={q} placeholder="Cerca per titolo" aria-label="Cerca" className="w-56" />
          <Select name="categoria" defaultValue={cat} aria-label="Categoria" className="w-auto"><option value="">Tutte le categorie</option>{Object.entries(CAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select name="auto" defaultValue={auto} aria-label="Automobile" className="w-auto"><option value="">Tutte le auto</option>{(vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select>
          <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
        </form>
        {!docs?.length ? <EmptyState icon={<FileText className="size-6" aria-hidden />} title="Nessun documento" description="Carica fatture e ricevute per averle sempre a portata di mano." /> : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="min-w-0"><span className="block truncate font-semibold">{d.title}</span><span className="text-sm text-muted">{CAT[d.category]} · {(d.user_vehicle_id && vname.get(d.user_vehicle_id)) ?? ""} · {d.document_date ? formatDate(d.document_date) : `caricato il ${formatDate(d.created_at)}`} · {(d.size_bytes / 1024 / 1024).toFixed(1)} MB</span></span>
                <span className="flex flex-wrap items-center gap-2">
                  {signed.get(d.id) && <><a href={signed.get(d.id)!.view} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:underline"><Eye className="size-4" aria-hidden /> Apri</a><a href={signed.get(d.id)!.download} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"><Download className="size-4" aria-hidden /> Scarica</a></>}
                  <ActionForm action={deleteDocument} submitLabel="Elimina" size="sm" variant="outline" hidden={{ document_id: d.id }} confirm="Eliminare definitivamente il documento?" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Carica documenti</h2>
        <DocumentUpload userId={user.id} vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: `${v.make} ${v.model}` }))} records={(records ?? []).map((r) => ({ id: r.id, label: `${r.title} (${formatDate(r.performed_on)})`, vehicleId: r.user_vehicle_id }))} />
        <p className="mt-3 text-xs text-muted">Conservazione: i documenti restano finché non li elimini o chiedi la cancellazione dell&apos;account (vedi Privacy).</p>
      </Card>
    </div>
  );
}

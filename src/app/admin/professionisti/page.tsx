import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminReviewProfile } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Officine e professionisti", robots: { index: false } };
const TYPES = ["officina", "meccanico", "venditore_auto", "venditore_ricambi"] as const;
const REVIEW = { bozza: "Bozza", inviato: "Inviato", in_verifica: "In verifica", approvato: "Approvato", rifiutato: "Rifiutato", sospeso: "Sospeso" } as const;

export default function ProfessionalsAdmin(props: PageProps<"/admin/professionisti">) {
  return <AdminPage title="Officine e professionisti" description="Elenco completo dei profili professionali: verifica dei dati aziendali, approvazione o rifiuto, attivazione e sospensione, recensioni e segnalazioni collegate. Le decisioni sono registrate nel registro attività."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("professionals.verify", "/admin/professionisti");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const type = (TYPES as readonly string[]).includes(s("tipo")) ? (s("tipo") as Enums<"app_role">) : "officina";
  const status = s("stato") in REVIEW ? (s("stato") as Enums<"profile_review_status">) : null;
  const q = s("q").replace(/[%,()]/g, " ").trim().slice(0, 60);
  const supabase = await createClient();
  let query = supabase.from("professional_profiles").select("id, user_id, display_name, slug, city, province, professional_type, review_status, is_published, identity_verified_at, business_verified_at, documents_checked_at, created_at, submitted_at")
    .eq("professional_type", type).is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
  if (status) query = query.eq("review_status", status);
  if (q) query = query.or(`display_name.ilike.%${q}%,city.ilike.%${q}%`);
  const { data } = await query;
  const ids = (data ?? []).map((p) => p.id);
  const [{ data: reviews }, { data: reports }] = await Promise.all([
    ids.length ? supabase.from("reviews").select("profile_id, rating, status").in("profile_id", ids) : Promise.resolve({ data: [] as { profile_id: string; rating: number; status: string }[] }),
    ids.length ? supabase.from("content_reports").select("target_id, status").eq("target_type", "profilo").in("target_id", ids) : Promise.resolve({ data: [] as { target_id: string; status: string }[] }),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <Select name="tipo" defaultValue={type} aria-label="Tipologia" className="w-auto">{TYPES.map((t) => <option key={t} value={t}>{ROLE_LABELS[t]}</option>)}</Select>
        <Select name="stato" defaultValue={status ?? ""} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries(REVIEW).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Input name="q" defaultValue={q} placeholder="Nome o città" aria-label="Cerca" className="w-48" />
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
      </form>
      {!data?.length ? <EmptyState title="Nessun profilo" description="Nessun professionista corrisponde ai filtri." /> : data.map((p) => {
        const rv = (reviews ?? []).filter((r) => r.profile_id === p.id && r.status === "pubblicata");
        const avg = rv.length ? (rv.reduce((a, r) => a + r.rating, 0) / rv.length).toFixed(1) : null;
        const openReports = (reports ?? []).filter((r) => r.target_id === p.id && r.status !== "archiviata" && r.status !== "risolta").length;
        return (
          <Card key={p.id} className="p-4">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span><span className="font-semibold">{p.display_name}</span> <span className="text-sm text-muted">· {p.city ?? "città ?"} · iscritto il {formatDate(p.created_at)}</span></span>
                <span className="flex flex-wrap gap-1">
                  <Badge tone={p.review_status === "approvato" ? "success" : p.review_status === "sospeso" || p.review_status === "rifiutato" ? "danger" : "warning"}>{REVIEW[p.review_status]}</Badge>
                  <Badge tone={p.is_published ? "success" : "neutral"}>{p.is_published ? "Pubblico" : "Non pubblico"}</Badge>
                  {avg && <Badge tone="neutral">★ {avg} ({rv.length})</Badge>}
                  {openReports > 0 && <Badge tone="danger">{openReports} segnalazioni</Badge>}
                </span>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                <div className="text-sm">
                  <p>Badge: {[p.identity_verified_at && "identità", p.business_verified_at && "attività", p.documents_checked_at && "documenti"].filter(Boolean).join(", ") || "nessuno"}</p>
                  {p.submitted_at && <p>Inviato in verifica il {formatDate(p.submitted_at)}</p>}
                  <p className="mt-2 flex flex-wrap gap-3">
                    {p.is_published && <Link className="underline" href={`/professionisti/${p.slug}`}>Profilo pubblico</Link>}
                    <Link className="underline" href="/admin/verifiche?tab=richieste">Documenti e richieste di verifica</Link>
                    <Link className="underline" href="/admin/recensioni">Recensioni</Link>
                    <Link className="underline" href="/admin/segnalazioni">Segnalazioni</Link>
                  </p>
                </div>
                <ActionForm action={adminReviewProfile} submitLabel="Applica" size="sm" hidden={{ id: p.id }} confirm="Confermi la decisione? Il professionista riceverà una notifica.">
                  <div className="grid grid-cols-2 gap-2">
                    <Field id={`d-${p.id}`} label="Decisione">
                      <Select id={`d-${p.id}`} name="decision" defaultValue={p.review_status === "approvato" ? "sospeso" : "approvato"}>
                        <option value="in_verifica">In verifica</option><option value="approvato">{p.review_status === "sospeso" ? "Riattiva (approva)" : "Approva e pubblica"}</option><option value="rifiutato">Rifiuta</option><option value="sospeso">Sospendi</option>
                      </Select>
                    </Field>
                    <Field id={`n-${p.id}`} label="Motivazione" hint="Obbligatoria per rifiuto e sospensione"><Input id={`n-${p.id}`} name="note" maxLength={1000} /></Field>
                  </div>
                </ActionForm>
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminClearBadge, adminReviewProfile, adminReviewVerification, adminVerifyCertification } from "@/lib/actions/admin";
import { REVIEW_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Verifica professionisti", robots: { index: false } };
const TYPE: Record<string, string> = { officina: "Officina", meccanico: "Meccanico", venditore_ricambi: "Ricambi", venditore_auto: "Concessionario" };
const VTYPE: Record<string, string> = { identita: "Identità", attivita_professionale: "Attività professionale", documentazione: "Documentazione" };

export default function VerificationsPage(props: PageProps<"/admin/verifiche">) {
  return (
    <>
      <PageHeader title="Verifica professionisti" description="Distingui profilo registrato, identità verificata, attività verificata e documenti verificati. La verifica non certifica la qualità del servizio." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/verifiche">["searchParams"] }) {
  await requirePermission("professionals.verify", "/admin/verifiche");
  const sp = await searchParams;
  const tab = sp.tab === "richieste" ? "richieste" : sp.tab === "certificazioni" ? "certificazioni" : "profili";
  const supabase = await createClient();
  return (
    <>
      <TabLinks current={tab} items={[{ key: "profili", label: "Profili", href: "/admin/verifiche" }, { key: "richieste", label: "Richieste di verifica", href: "/admin/verifiche?tab=richieste" }, { key: "certificazioni", label: "Certificazioni", href: "/admin/verifiche?tab=certificazioni" }]} />
      {tab === "profili" && <Profiles supabase={supabase} status={(sp.stato as Enums<"profile_review_status">) ?? null} />}
      {tab === "richieste" && <Requests supabase={supabase} />}
      {tab === "certificazioni" && <Certs supabase={supabase} />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;

async function Profiles({ supabase, status }: { supabase: SB; status: Enums<"profile_review_status"> | null }) {
  const states: Enums<"profile_review_status">[] = ["inviato", "in_verifica", "approvato", "rifiutato", "sospeso", "bozza"];
  const current = status && states.includes(status) ? status : "inviato";
  const { data } = await supabase.from("professional_profiles").select("id, user_id, slug, display_name, professional_type, city, description, categories, submitted_at, review_status, business_verified_at, identity_verified_at, documents_checked_at").eq("review_status", current).is("deleted_at", null).order("submitted_at", { ascending: true }).limit(60);
  const details = await Promise.all((data ?? []).map((p) => supabase.rpc("professional_private_details", { profile_id: p.id })));
  const { data: biz } = data?.length ? await supabase.from("business_profiles").select("user_id, legal_name, vat_number").in("user_id", data.map((p) => p.user_id)) : { data: [] };
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">{states.map((s) => <Link key={s} href={`/admin/verifiche?stato=${s}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${s === current ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{REVIEW_STATUS_LABELS[s]}</Link>)}</div>
      {!data?.length ? <EmptyState title="Nessun profilo in questo stato" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((p, i) => { const d = details[i].data?.[0]; const b = biz?.find((x) => x.user_id === p.user_id); return (
            <li key={p.id}><Card className="flex flex-col gap-2 p-4">
              <p className="font-bold">{p.display_name} <Badge tone="neutral">{TYPE[p.professional_type]}</Badge></p>
              <p className="text-sm text-muted">{p.city ?? "città ?"}{d?.address_line ? ` · ${d.address_line}` : ""}{p.submitted_at ? ` · inviato il ${formatDate(p.submitted_at)}` : ""} · referente: {d?.contact_person ?? "—"} · {b ? `${b.legal_name ?? ""} P.IVA ${b.vat_number ?? "—"}` : "dati aziendali non inseriti"}</p>
              {p.description && <p className="line-clamp-3 text-sm">{p.description}</p>}
              <p className="flex flex-wrap gap-1.5 text-xs">{[["Attività", p.business_verified_at], ["Identità", p.identity_verified_at], ["Documenti", p.documents_checked_at]].map(([k, v]) => <Badge key={k as string} tone={v ? "success" : "neutral"}>{k}: {v ? "verificata" : "no"}</Badge>)}</p>
              <ActionForm action={adminReviewProfile} submitLabel="Registra esito" size="sm" hidden={{ id: p.id }}>
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <Field id={`d-${p.id}`} label="Esito"><Select id={`d-${p.id}`} name="decision" defaultValue={current === "inviato" ? "in_verifica" : "approvato"}><option value="in_verifica">In verifica</option><option value="approvato">Approva e pubblica</option><option value="rifiutato">Rifiuta</option><option value="sospeso">Sospendi</option></Select></Field>
                  <Field id={`n-${p.id}`} label="Nota per il professionista"><Input id={`n-${p.id}`} name="note" maxLength={1000} /></Field>
                </div>
              </ActionForm>
              {(p.business_verified_at || p.identity_verified_at || p.documents_checked_at) && (
                <ActionForm action={adminClearBadge} submitLabel="Revoca badge" size="sm" variant="danger" hidden={{ user_id: p.user_id }} confirm="Revocare il badge?">
                  <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                    <Field id={`b-${p.id}`} label="Badge"><Select id={`b-${p.id}`} name="badge">{Object.entries(VTYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                    <Field id={`br-${p.id}`} label="Motivazione"><Input id={`br-${p.id}`} name="reason" /></Field>
                  </div>
                </ActionForm>
              )}
            </Card></li>); })}
        </ul>
      )}
    </>
  );
}

async function Requests({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("verification_requests").select("*").in("status", ["in_attesa", "in_revisione"]).order("created_at").limit(60);
  if (!data?.length) return <EmptyState title="Nessuna richiesta di verifica in attesa" />;
  // Documenti privati: collegamenti firmati validi 5 minuti, solo per lo staff autorizzato.
  const paths = data.flatMap((r) => (r.user_notes?.match(/Documenti caricati: (.*)$/m)?.[1] ?? "").split(", ").filter((p) => p.startsWith(`${r.user_id}/`)));
  const { data: signed } = paths.length ? await supabase.storage.from("verification-documents").createSignedUrls(paths, 300) : { data: [] };
  const url = new Map((signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path!, s.signedUrl]));
  const { data: names } = await supabase.from("profiles").select("id, email, full_name").in("id", data.map((r) => r.user_id));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((r) => { const u = names?.find((n) => n.id === r.user_id); const docs = (r.user_notes?.match(/Documenti caricati: (.*)$/m)?.[1] ?? "").split(", ").filter(Boolean); return (
        <li key={r.id}><Card className="flex flex-col gap-2 p-4">
          <p className="font-bold">{VTYPE[r.verification_type]} · {u?.full_name ?? u?.email}</p>
          <p className="text-sm text-muted">Richiesta del {formatDate(r.created_at)} · stato {r.status.replace("_", " ")}</p>
          {r.user_notes && <p className="text-sm whitespace-pre-line">{r.user_notes.replace(/Documenti caricati: .*$/m, "").trim()}</p>}
          {docs.length > 0 && <ul className="flex flex-wrap gap-2 text-sm">{docs.map((d, i) => <li key={d}>{url.get(d) ? <a className="font-semibold text-orange-700 underline" href={url.get(d)!} target="_blank" rel="noopener noreferrer">Documento {i + 1}</a> : `Documento ${i + 1} non disponibile`}</li>)}</ul>}
          <ActionForm action={adminReviewVerification} submitLabel="Registra esito" size="sm" hidden={{ id: r.id }}>
            <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
              <Field id={`vd-${r.id}`} label="Esito"><Select id={`vd-${r.id}`} name="decision" defaultValue="approvata"><option value="in_revisione">In revisione</option><option value="approvata">Approva (assegna il badge)</option><option value="rifiutata">Rifiuta</option></Select></Field>
              <Field id={`vn-${r.id}`} label="Nota"><Input id={`vn-${r.id}`} name="note" maxLength={1000} /></Field>
            </div>
          </ActionForm>
        </Card></li>); })}
    </ul>
  );
}

async function Certs({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("professional_certifications").select("id, title, issuer, issued_on, document_path, verified_at, professional_profiles(display_name)").is("verified_at", null).order("created_at").limit(60);
  if (!data?.length) return <EmptyState title="Nessuna certificazione da verificare" />;
  const paths = data.map((c) => c.document_path).filter(Boolean) as string[];
  const { data: signed } = paths.length ? await supabase.storage.from("verification-documents").createSignedUrls(paths, 300) : { data: [] };
  const url = new Map((signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path!, s.signedUrl]));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => (
        <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span><strong>{c.title}</strong> · {(c.professional_profiles as unknown as { display_name: string } | null)?.display_name}{c.issuer ? ` · ${c.issuer}` : ""}{c.issued_on ? ` · ${formatDate(c.issued_on)}` : ""}<br />{c.document_path && url.get(c.document_path) ? <a className="text-sm font-semibold text-orange-700 underline" href={url.get(c.document_path)!} target="_blank" rel="noopener noreferrer">Apri il documento</a> : <span className="text-sm text-warning">Nessun documento allegato</span>}</span>
          <span className="flex gap-2"><ActionForm action={adminVerifyCertification} submitLabel="Verifica" size="sm" hidden={{ id: c.id, approve: "1" }} /><ActionForm action={adminVerifyCertification} submitLabel="Respingi" size="sm" variant="outline" hidden={{ id: c.id, approve: "0" }} /></span>
        </Card></li>
      ))}
    </ul>
  );
}

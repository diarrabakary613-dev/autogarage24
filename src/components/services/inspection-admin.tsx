import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { adminSetOperator } from "@/lib/actions/roadside";
import { adminReviewAuthorization } from "@/lib/actions/inspection";
import type { createClient } from "@/lib/supabase/server";
import { APPT_STATUS, INSPECTION_CATEGORIES } from "@/lib/inspection/labels";
import { OPERATOR_STATUS } from "@/lib/services/labels";
import { formatDateTime } from "@/lib/utils";

type SB = Awaited<ReturnType<typeof createClient>>;

export async function InspectionAdmin({ supabase }: { supabase: SB }) {
  const [{ data: centers }, { data: auths }, { data: appts }] = await Promise.all([
    supabase.from("inspection_centers").select("*, professional_profiles(display_name, city)").order("created_at", { ascending: false }).limit(100),
    supabase.from("inspection_authorizations").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("inspection_appointments").select("status"),
  ]);
  const paths = (auths ?? []).map((a) => a.document_path);
  const { data: signed } = paths.length ? await supabase.storage.from("verification-documents").createSignedUrls(paths, 300) : { data: [] };
  const url = new Map((signed ?? []).flatMap((s) => (s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [])));
  if (!centers?.length) return <EmptyState title="Nessun centro revisione registrato" />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Appuntamenti: {Object.entries(APPT_STATUS).map(([k, v]) => `${v.label} ${(appts ?? []).filter((a) => a.status === k).length}`).join(" · ")}</p>
      {centers.map((c) => {
        const p = c.professional_profiles as unknown as { display_name: string; city: string | null };
        const mine = (auths ?? []).filter((a) => a.profile_id === c.profile_id);
        return (
          <Card key={c.profile_id} className="flex flex-col gap-2 p-4">
            <p className="font-bold">{p.display_name} <Badge tone={OPERATOR_STATUS[c.status].tone}>{OPERATOR_STATUS[c.status].label}</Badge></p>
            <p className="text-sm text-muted">{p.city} · {c.vehicle_categories.map((x) => INSPECTION_CATEGORIES[x]).join(", ")}</p>
            <ActionForm action={adminSetOperator} submitLabel="Applica" size="sm" hidden={{ kind: "revisione", profile_id: c.profile_id }}>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                <Field id={`s-${c.profile_id}`} label="Profilo"><Select id={`s-${c.profile_id}`} name="status" defaultValue={c.status === "attivo" ? "sospeso" : "attivo"}><option value="attivo">Attiva</option><option value="sospeso">Sospendi</option><option value="rifiutato">Rifiuta</option></Select></Field>
                <Field id={`n-${c.profile_id}`} label="Motivazione"><Input id={`n-${c.profile_id}`} name="note" maxLength={500} /></Field>
              </div>
            </ActionForm>
            {mine.map((a) => (
              <div key={a.id} className="rounded-xl bg-mist p-3 text-sm">
                <p><strong>{a.authorization_number}</strong> · {a.authority} · {a.status} · caricata {formatDateTime(a.created_at)} {url.get(a.document_path) && <a className="underline" target="_blank" rel="noreferrer" href={url.get(a.document_path)}>apri documento</a>}</p>
                {a.status === "in_verifica" && (
                  <ActionForm action={adminReviewAuthorization} submitLabel="Registra la verifica" size="sm" hidden={{ id: a.id }} className="mt-2">
                    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                      <Field id={`d-${a.id}`} label="Esito"><Select id={`d-${a.id}`} name="decision"><option value="verificata">Verificata</option><option value="respinta">Respinta</option></Select></Field>
                      <Field id={`r-${a.id}`} label="Come è stata verificata (fonte, data)"><Input id={`r-${a.id}`} name="note" required maxLength={500} /></Field>
                    </div>
                  </ActionForm>
                )}
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { FileUploader } from "@/components/ui/file-uploader";
import { PartForm } from "@/components/parts/part-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/actions/helpers";
import { addPartCompatibility, deletePartCompatibility, deletePartImage, registerPartImage, submitPart } from "@/lib/actions/parts";
import { PART_STATUS_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { BRANDS, findBrand } from "@/config/brands";

export const metadata: Metadata = { title: "Modifica ricambio", robots: { index: false } };

export default function EditPartPage(props: PageProps<"/dashboard/ricambi/[id]">) {
  return <Suspense fallback={<Skeleton className="h-[700px]" />}><Editor params={props.params} searchParams={props.searchParams} /></Suspense>;
}

async function Editor({ params, searchParams }: { params: PageProps<"/dashboard/ricambi/[id]">["params"]; searchParams: PageProps<"/dashboard/ricambi/[id]">["searchParams"] }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/ricambi/${id}`);
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: part }, { data: cats }, { data: imgs }, { data: compat }] = await Promise.all([
    supabase.from("part_listings").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("part_categories").select("id, name, parent_id").eq("active", true).order("position"),
    supabase.from("part_images").select("id, storage_path, is_cover").eq("part_id", id).order("position"),
    supabase.from("part_compatibility").select("*").eq("part_id", id),
  ]);
  if (!part) notFound();
  const canSubmit = ["bozza", "rifiutato", "scaduto"].includes(part.status);
  return (
    <>
      <PageHeader title={part.title} description={<>Stato: <strong>{PART_STATUS_LABELS[part.status]}</strong>{part.status_note ? ` — ${part.status_note}` : ""} · <Link href="/dashboard/ricambi" className="underline">Tutti i ricambi</Link></>} />
      {sp.creato && <Alert tone="success" className="mb-4">Bozza creata. Ora aggiungi le foto e le compatibilità, poi inviala in revisione.</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="mb-4 text-lg font-bold">1. Dati del prodotto</h2><PartForm part={part} categories={cats ?? []} /></Card>
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">2. Fotografie</h2>
            <FileUploader bucket="listing-images" folder={user.id} kind="image" label="Aggiungi foto (max 12)" multiple max={12} onUploaded={registerPartImage.bind(null, id)} />
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {(imgs ?? []).map((i) => (
                <li key={i.id} className="flex flex-col gap-1">
                  <div className={`relative aspect-square overflow-hidden rounded-lg border-2 ${i.is_cover ? "border-orange" : "border-line"}`}>{publicFileUrl("listing-images", i.storage_path) && <Image src={publicFileUrl("listing-images", i.storage_path)!} alt="" fill sizes="150px" className="object-cover" />}</div>
                  <ActionForm action={deletePartImage} submitLabel="Elimina" size="sm" variant="danger" hidden={{ image_id: i.id, part_id: id }} />
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-bold">Compatibilità</h2>
            <p className="mb-3 text-sm text-muted">Indica le automobili compatibili con il maggior dettaglio possibile: anni, versione e codice motore. Senza questi dati la compatibilità sarà mostrata come «potenziale» o «da verificare». Dichiarazioni false comportano la rimozione dell&apos;annuncio.</p>
            <ul className="mb-4 flex flex-col gap-2 text-sm">
              {(compat ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-mist p-2">
                  <span>{findBrand(c.make_slug)?.name ?? c.make_slug} {c.model} {c.version ?? ""} {c.year_from || c.year_to ? `(${c.year_from ?? "…"}–${c.year_to ?? "…"})` : ""} {c.engine_code ? `· ${c.engine_code}` : ""} · {c.basis.replace(/_/g, " ")}</span>
                  <ActionForm action={deletePartCompatibility} submitLabel="Rimuovi" size="sm" variant="outline" hidden={{ compat_id: c.id, part_id: id }} />
                </li>
              ))}
            </ul>
            <ActionForm action={addPartCompatibility} submitLabel="Aggiungi compatibilità" hidden={{ part_id: id }} resetOnSuccess>
              {(s) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="cm-mk" label="Marca"><Select id="cm-mk" name="make_slug" defaultValue=""><option value="" disabled>Scegli…</option>{BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</Select></Field>
                  <Field id="cm-md" label="Modello" error={s.fieldErrors?.model}><Input id="cm-md" name="model" /></Field>
                  <Field id="cm-v" label="Versione" optional><Input id="cm-v" name="version" /></Field>
                  <Field id="cm-g" label="Generazione" optional><Input id="cm-g" name="generation" /></Field>
                  <Field id="cm-y1" label="Dall'anno" optional><Input id="cm-y1" name="year_from" inputMode="numeric" /></Field>
                  <Field id="cm-y2" label="All'anno" optional><Input id="cm-y2" name="year_to" inputMode="numeric" /></Field>
                  <Field id="cm-e" label="Motorizzazione" optional><Input id="cm-e" name="engine" placeholder="1.2 benzina 69 CV" /></Field>
                  <Field id="cm-ec" label="Codice motore" optional><Input id="cm-ec" name="engine_code" /></Field>
                  <Field id="cm-o" label="Riferimento OEM" optional><Input id="cm-o" name="oem_reference" /></Field>
                  <Field id="cm-b" label="Fonte"><Select id="cm-b" name="basis" defaultValue="dichiarazione_venditore"><option value="dichiarazione_venditore">Mia dichiarazione</option><option value="codice_oem">Corrispondenza del codice OEM</option></Select></Field>
                </div>
              )}
            </ActionForm>
          </Card>
          {canSubmit && (
            <Card className="p-6">
              <h2 className="mb-3 text-lg font-bold">3. Invio in revisione</h2>
              <ActionForm action={submitPart} submitLabel="Invia in revisione" hidden={{ part_id: id }}>
                {(s) => (<>
                  <Checkbox id="sp1" name="declare_accuracy" label="Le informazioni (codici, condizione, compatibilità) sono corrette e il prodotto non è contraffatto." error={s.fieldErrors?.declare_accuracy} />
                  <Checkbox id="sp2" name="declare_photos" label="Ho il diritto di usare le fotografie caricate." error={s.fieldErrors?.declare_photos} />
                  <Checkbox id="sp3" name="accept_terms" label={<>Accetto le <Link href="/termini" className="underline">condizioni della piattaforma</Link>.</>} error={s.fieldErrors?.accept_terms} />
                </>)}
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

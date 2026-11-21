import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteOverride, saveArticle, saveCategory, saveOverride, saveRedirect, saveRobotsExtra, toggleRedirect } from "@/lib/actions/seo";
import { PUBLIC_ROUTES } from "@/config/seo";
import { categoryForType, LOCAL_CATEGORIES, NEO_BANDS, type NeoBand } from "@/lib/seo/sitemap-data";
import { thirdPartyIds } from "@/lib/consent";
import { getSiteUrl } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "SEO Manager", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;
const TABS = ["controlli", "articoli", "categorie", "meta", "redirect", "sitemap", "integrazioni"] as const;
const STATUS = { bozza: "Bozza", programmato: "Programmato", pubblicato: "Pubblicato", archiviato: "Archiviato" } as const;

export default function SeoPage(props: PageProps<"/admin/seo">) {
  return <AdminPage title="SEO Manager" description="Controlli di qualità, articoli del blog, meta delle pagine, redirect, sitemap e robots. Le pagine locali e per neopatentati diventano indicizzabili solo con contenuti reali sufficienti."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("seo.manage", "/admin/seo");
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as (typeof TABS)[number]) : "controlli";
  const supabase = await createClient();
  const label = { controlli: "Controlli", articoli: "Articoli", categorie: "Categorie", meta: "Meta pagine", redirect: "Redirect", sitemap: "Sitemap e robots", integrazioni: "Search Console e GA4" };
  return (
    <>
      <TabLinks current={tab} items={TABS.map((t) => ({ key: t, label: label[t], href: t === "controlli" ? "/admin/seo" : `/admin/seo?tab=${t}` }))} />
      {tab === "controlli" && <Checks supabase={supabase} />}
      {tab === "articoli" && <Articles sp={sp} supabase={supabase} userId={user.id} />}
      {tab === "categorie" && <Categories supabase={supabase} />}
      {tab === "meta" && <Meta supabase={supabase} />}
      {tab === "redirect" && <Redirects supabase={supabase} />}
      {tab === "sitemap" && <SitemapTab supabase={supabase} />}
      {tab === "integrazioni" && <Integrations />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;

async function Checks({ supabase }: { supabase: SB }) {
  const [{ data: issues }, { data: local }, { data: bands }] = await Promise.all([supabase.rpc("admin_seo_checks"), supabase.rpc("seo_local_pages"), supabase.rpc("seo_neo_bands")]);
  const tone = { alta: "danger", media: "warning", bassa: "neutral" } as const;
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5"><h2 className="font-bold">Problemi rilevati ({issues?.length ?? 0})</h2>
        {!issues?.length ? <p className="mt-2 text-sm text-muted">Nessun problema rilevato dai controlli automatici.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{issues.slice(0, 200).map((i, n) => (
            <li key={n} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><Badge tone={tone[i.severity as keyof typeof tone] ?? "neutral"}>{i.severity}</Badge> <strong>{i.area}</strong> · {i.item} — {i.issue}</span><Link className="underline" href={i.link}>Apri</Link></li>
          ))}</ul>
        )}
      </Card>
      <Card className="p-5"><h2 className="font-bold">Pagine locali (città + categoria)</h2>
        <p className="text-sm text-muted">Una pagina esiste solo se c&apos;è almeno un profilo pubblicato; è indicizzabile (e in sitemap) solo con il numero minimo di profili impostato.</p>
        {!local?.length ? <p className="mt-2 text-sm">Nessun profilo pubblicato con città.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{local.map((l) => { const c = categoryForType(l.professional_type); return c ? (
            <li key={`${l.city_slug}-${c}`} className="flex flex-wrap justify-between gap-2 py-2"><Link className="underline" href={`/zona/${l.city_slug}/${c}`}>{LOCAL_CATEGORIES[c].label} a {l.city}</Link><span>{l.profiles} profili · {l.indexable ? <Badge tone="success">Indicizzabile</Badge> : <Badge>noindex</Badge>}</span></li>) : null; })}</ul>
        )}
      </Card>
      <Card className="p-5"><h2 className="font-bold">Pagine neopatentati per prezzo</h2>
        <ul className="mt-2 divide-y divide-line text-sm">{(bands ?? []).map((b) => (
          <li key={b.band} className="flex flex-wrap justify-between gap-2 py-2"><Link className="underline" href={`/auto-per-neopatentati/prezzo/${b.band}`}>{NEO_BANDS[b.band as NeoBand]?.label ?? b.band}</Link><span>{b.listings} annunci compatibili · {b.indexable ? <Badge tone="success">Indicizzabile</Badge> : <Badge>noindex</Badge>}</span></li>
        ))}</ul>
      </Card>
    </div>
  );
}

async function Articles({ sp, supabase, userId }: { sp: SP; supabase: SB; userId: string }) {
  const id = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : null;
  const [{ data: list }, { data: cats }] = await Promise.all([
    supabase.from("blog_articles").select("id, slug, title, status, publish_at, published_at, updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("blog_categories").select("id, name").order("sort"),
  ]);
  const editing = id ? (await supabase.from("blog_articles").select("*").eq("id", id).maybeSingle()).data : null;
  const isNew = sp.nuovo === "1";
  return (
    <div className="flex flex-col gap-6">
      {sp.salvato && <Alert tone="success">Articolo salvato.</Alert>}
      {(editing || isNew) ? (
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{editing ? "Modifica articolo" : "Nuovo articolo"}</h2>
            {editing && <ButtonLink size="sm" variant="outline" href={`/admin/seo/anteprima/${editing.id}`}>Anteprima</ButtonLink>}</div>
          <ArticleForm a={editing ?? undefined} cats={cats ?? []} userId={userId} />
        </Card>
      ) : <div><ButtonLink href="/admin/seo?tab=articoli&nuovo=1">Nuovo articolo</ButtonLink></div>}
      {!list?.length ? <EmptyState title="Nessun articolo" description="Scrivi guide utili e verificabili: niente contenuti generati in massa o duplicati." /> : (
        <Card className="p-5"><ul className="divide-y divide-line text-sm">{list.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span><strong>{a.title}</strong> · /blog/{a.slug}{a.status === "programmato" && a.publish_at ? ` · esce il ${formatDateTime(a.publish_at)}` : ""}</span>
            <span className="flex items-center gap-2"><Badge tone={a.status === "pubblicato" ? "success" : a.status === "programmato" ? "orange" : "neutral"}>{STATUS[a.status as keyof typeof STATUS]}</Badge>
              <Link className="underline" href={`/admin/seo?tab=articoli&id=${a.id}`}>Modifica</Link></span>
          </li>
        ))}</ul></Card>
      )}
    </div>
  );
}

function ArticleForm({ a, cats, userId }: { a?: Tables<"blog_articles">; cats: { id: string; name: string }[]; userId: string }) {
  const local = (iso: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 16).replace(" ", "T") : "");
  return (
    <ActionForm action={saveArticle} submitLabel="Salva" hidden={a ? { id: a.id } : undefined}>
      {(state) => { const e = state.fieldErrors ?? {}; return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="title" label="Titolo (H1)" error={e.title} className="md:col-span-2"><Input id="title" name="title" required minLength={10} maxLength={110} defaultValue={a?.title} /></Field>
          <Field id="slug" label="Indirizzo (/blog/…)" error={e.slug}><Input id="slug" name="slug" required defaultValue={a?.slug} /></Field>
          <Field id="author_name" label="Autore" hint="Persona reale o «Redazione AutoGarage24»." error={e.author_name}><Input id="author_name" name="author_name" required defaultValue={a?.author_name ?? "Redazione AutoGarage24"} /></Field>
          <Field id="category_id" label="Categoria" optional><Select id="category_id" name="category_id" defaultValue={a?.category_id ?? ""}><option value="">Nessuna</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field id="status" label="Stato"><Select id="status" name="status" defaultValue={a?.status ?? "bozza"}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="publish_at" label="Data di pubblicazione (ora italiana)" hint="Obbligatoria per «Programmato»." optional error={e.publish_at}><Input id="publish_at" name="publish_at" type="datetime-local" defaultValue={local(a?.publish_at ?? null)} /></Field>
          <Field id="excerpt" label="Sommario" optional className="md:col-span-2"><Textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={a?.excerpt ?? ""} /></Field>
          <Field id="content" label="Testo" hint="## Titolo, ### Sottotitolo, - elenco, **grassetto**, [link](/pagina). Riga vuota tra i paragrafi." error={e.content} className="md:col-span-2"><Textarea id="content" name="content" rows={18} defaultValue={a?.content ?? ""} className="font-mono text-sm" /></Field>
          <Field id="meta_title" label="Titolo SEO" hint="Max 70 caratteri; se vuoto si usa il titolo." optional><Input id="meta_title" name="meta_title" maxLength={70} defaultValue={a?.meta_title ?? ""} /></Field>
          <Field id="meta_description" label="Meta description" hint="Max 160 caratteri." optional><Input id="meta_description" name="meta_description" maxLength={160} defaultValue={a?.meta_description ?? ""} /></Field>
          <div><FileUploader bucket="blog-images" folder={userId} kind="image" label={a?.cover_path ? "Sostituisci la copertina" : "Immagine di copertina"} name="cover_path" max={1} /><p className="mt-1 text-xs text-muted">Solo immagini proprie o con licenza d&apos;uso.</p></div>
          <Field id="cover_alt" label="Testo alternativo della copertina" optional><Input id="cover_alt" name="cover_alt" maxLength={160} defaultValue={a?.cover_alt ?? ""} /></Field>
        </div>); }}
    </ActionForm>
  );
}

async function Categories({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("blog_categories").select("*").order("sort");
  return (
    <div className="flex flex-col gap-4">
      {(data ?? []).map((c) => (
        <Card key={c.id} className="p-4"><ActionForm action={saveCategory} submitLabel="Salva" size="sm" hidden={{ id: c.id }}>
          <div className="grid gap-3 md:grid-cols-3"><Field id={`n-${c.id}`} label="Nome"><Input id={`n-${c.id}`} name="name" defaultValue={c.name} /></Field>
            <Field id={`s-${c.id}`} label="Indirizzo"><Input id={`s-${c.id}`} name="slug" defaultValue={c.slug} /></Field>
            <Field id={`d-${c.id}`} label="Descrizione" optional><Input id={`d-${c.id}`} name="description" defaultValue={c.description ?? ""} /></Field></div>
        </ActionForm></Card>
      ))}
      <Card className="p-4"><h2 className="mb-2 font-bold">Nuova categoria</h2><ActionForm action={saveCategory} submitLabel="Crea" size="sm" resetOnSuccess>
        <div className="grid gap-3 md:grid-cols-3"><Field id="nc-n" label="Nome"><Input id="nc-n" name="name" required /></Field><Field id="nc-s" label="Indirizzo"><Input id="nc-s" name="slug" required /></Field><Field id="nc-d" label="Descrizione" optional><Input id="nc-d" name="description" /></Field></div>
      </ActionForm></Card>
    </div>
  );
}

async function Meta({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("seo_overrides").select("*").order("path");
  const byPath = new Map((data ?? []).map((o) => [o.path, o]));
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">Gli override valgono per le pagine pubbliche principali elencate qui sotto. Titolo 10–70 caratteri, descrizione 50–160. «noindex» esclude la pagina da Google e dalla sitemap.</Alert>
      {PUBLIC_ROUTES.map((r) => { const o = byPath.get(r.path); return (
        <details key={r.path} className="rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer font-semibold">{r.path} {o && <Badge tone="orange">personalizzato</Badge>}{o?.noindex && <Badge tone="danger">noindex</Badge>}</summary>
          <ActionForm action={saveOverride} submitLabel="Salva" size="sm" hidden={{ path: r.path }} className="mt-3">
            {(state) => { const e = state.fieldErrors ?? {}; return (
              <div className="grid gap-3 md:grid-cols-2">
                <Field id={`t-${r.path}`} label="Titolo" optional error={e.title}><Input id={`t-${r.path}`} name="title" maxLength={70} defaultValue={o?.title ?? ""} /></Field>
                <Field id={`c-${r.path}`} label="Canonical" optional error={e.canonical}><Input id={`c-${r.path}`} name="canonical" defaultValue={o?.canonical ?? ""} placeholder={r.path} /></Field>
                <Field id={`d-${r.path}`} label="Descrizione" optional error={e.description} className="md:col-span-2"><Input id={`d-${r.path}`} name="description" maxLength={160} defaultValue={o?.description ?? ""} /></Field>
                <Checkbox id={`ni-${r.path}`} name="noindex" defaultChecked={o?.noindex} label="Escludi dall'indice (noindex)" />
              </div>); }}
          </ActionForm>
          {o && <ActionForm action={deleteOverride} submitLabel="Ripristina predefiniti" size="sm" variant="ghost" hidden={{ path: r.path }} className="mt-2" />}
        </details>
      ); })}
    </div>
  );
}

async function Redirects({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("seo_redirects").select("*").order("created_at", { ascending: false });
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5"><h2 className="mb-2 font-bold">Nuovo redirect</h2>
        <ActionForm action={saveRedirect} submitLabel="Aggiungi" resetOnSuccess>
          {(state) => { const e = state.fieldErrors ?? {}; return (
            <div className="grid gap-3 md:grid-cols-4">
              <Field id="from_path" label="Da" error={e.from_path}><Input id="from_path" name="from_path" required placeholder="/vecchia-pagina" /></Field>
              <Field id="to_path" label="A" error={e.to_path}><Input id="to_path" name="to_path" required placeholder="/nuova-pagina" /></Field>
              <Field id="status_code" label="Tipo"><Select id="status_code" name="status_code" defaultValue="301"><option value="301">301 permanente</option><option value="302">302 temporaneo</option><option value="308">308 permanente</option></Select></Field>
              <Field id="note" label="Nota" optional><Input id="note" name="note" /></Field>
            </div>); }}
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Catene e cicli sono bloccati; aree riservate (admin, area personale, API) escluse.</p>
      </Card>
      {!data?.length ? <EmptyState title="Nessun redirect" /> : (
        <Card className="p-5"><ul className="divide-y divide-line text-sm">{data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="font-mono">{r.from_path} → {r.to_path}</span>
            <span className="flex items-center gap-2"><Badge tone={r.active ? "success" : "neutral"}>{r.status_code} {r.active ? "attivo" : "spento"}</Badge>
              <ActionForm action={toggleRedirect} submitLabel={r.active ? "Disattiva" : "Attiva"} size="sm" variant="outline" hidden={{ id: r.id, action: r.active ? "off" : "on" }} />
              <ActionForm action={toggleRedirect} submitLabel="Elimina" size="sm" variant="ghost" hidden={{ id: r.id, action: "delete" }} confirm="Eliminare il redirect?" /></span>
          </li>
        ))}</ul></Card>
      )}
    </div>
  );
}

async function SitemapTab({ supabase }: { supabase: SB }) {
  const { data: s } = await supabase.from("platform_settings").select("value").eq("key", "seo_robots_extra_disallow").maybeSingle();
  const extra = Array.isArray(s?.value) ? (s.value as string[]) : [];
  const site = getSiteUrl();
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5"><h2 className="font-bold">Sitemap</h2>
        <p className="mt-1 text-sm">Generata automaticamente: pagine pubbliche principali (meno quelle in noindex), annunci pubblicati, profili approvati con descrizione, offerte attive, articoli pubblicati, landing indicizzabili, pagine locali e neopatentati sopra soglia. Aggiornamento entro un&apos;ora.</p>
        <p className="mt-2"><a className="font-semibold underline" href="/sitemap.xml">{site}/sitemap.xml</a></p>
      </Card>
      <Card className="p-5"><h2 className="font-bold">robots.txt</h2>
        <p className="mt-1 text-sm">Sempre esclusi: area personale, amministrazione, Business Center, autenticazione, disiscrizione, inviti, API. <a className="underline" href="/robots.txt">Vedi robots.txt</a></p>
        <ActionForm action={saveRobotsExtra} submitLabel="Salva" size="sm" className="mt-3">
          <Field id="paths" label="Percorsi aggiuntivi da escludere (uno per riga)" optional><Textarea id="paths" name="paths" rows={4} defaultValue={extra.join("\n")} className="font-mono text-sm" /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}

function Integrations() {
  const gsc = process.env.NEXT_PUBLIC_GSC_VERIFICATION;
  const ga4 = thirdPartyIds().ga4;
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5"><h2 className="font-bold">Google Search Console</h2>
        <p className="mt-1 text-sm">{gsc ? <><Badge tone="success">Meta tag presente</Badge> La verifica del dominio va completata e confermata dentro Search Console: questo pannello non può confermarla.</> : <><Badge>Non configurato</Badge> Imposta NEXT_PUBLIC_GSC_VERIFICATION con il codice del meta tag fornito da Search Console (oppure verifica il dominio via DNS, con autorizzazione del fondatore).</>}</p>
        <p className="mt-2 text-sm">Dopo la verifica: invia {getSiteUrl()}/sitemap.xml da Search Console.</p>
      </Card>
      <Card className="p-5"><h2 className="font-bold">Google Analytics 4</h2>
        <p className="mt-1 text-sm">{ga4 ? <><Badge tone="success">ID configurato: {ga4}</Badge> Si carica solo dopo il consenso nel banner. Controlla in GA4 che i dati arrivino.</> : <><Badge>Non configurato</Badge> Imposta NEXT_PUBLIC_GA4_ID. Senza GA4 resta attiva la misurazione interna senza cookie.</>}</p>
      </Card>
    </div>
  );
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, isUuid, ok, oneOf, str } from "./helpers";

const S = "/admin/seo";
const refresh = (...tags: string[]) => { for (const t of tags) revalidateTag(t, "max"); revalidatePath(S); };
const PATH = /^\/[a-z0-9/_-]{0,199}$/;

export async function saveArticle(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const e: Record<string, string> = {};
  const slug = str(fd, "slug", 90)?.toLowerCase();
  const title = str(fd, "title", 110);
  const content = str(fd, "content", 60000) ?? "";
  const author = str(fd, "author_name", 80);
  const status = oneOf(fd, "status", ["bozza", "programmato", "pubblicato", "archiviato"] as const) ?? "bozza";
  const publishAt = str(fd, "publish_at", 20);
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) e.slug = "Lettere minuscole, numeri e trattini.";
  if (!title || title.length < 10) e.title = "Da 10 a 110 caratteri.";
  if (!author || author.length < 2) e.author_name = "Indica l'autore reale.";
  if (status !== "bozza" && status !== "archiviato" && content.length < 300) e.content = "Per pubblicare servono almeno 300 caratteri.";
  if (status === "programmato" && !publishAt) e.publish_at = "Indica data e ora di pubblicazione.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const cat = str(fd, "category_id", 40);
  const row = {
    slug: slug!, title: title!, content, author_name: author!, status,
    excerpt: str(fd, "excerpt", 300), meta_title: str(fd, "meta_title", 70), meta_description: str(fd, "meta_description", 160),
    category_id: cat && isUuid(cat) ? cat : null, cover_alt: str(fd, "cover_alt", 160),
    publish_at: publishAt ? new Date(publishAt).toISOString() : null,
    ...(str(fd, "cover_path", 300) ? { cover_path: str(fd, "cover_path", 300) } : {}),
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const { data, error } = id && isUuid(id)
    ? await supabase.from("blog_articles").update(row).eq("id", id).select("id").single()
    : await supabase.from("blog_articles").insert(row).select("id").single();
  if (error) return fail(error.code === "23505" ? "Esiste già un articolo con questo indirizzo." : dbErrorMessage(error));
  refresh("blog", "seo", "sitemap");
  if (!id) redirect(`${S}?tab=articoli&id=${data.id}&salvato=1`);
  return ok(status === "pubblicato" ? "Articolo pubblicato." : status === "programmato" ? "Articolo programmato." : "Articolo salvato.");
}

export async function saveCategory(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const slug = str(fd, "slug", 60)?.toLowerCase();
  const name = str(fd, "name", 60);
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || !name || name.length < 3) return fail("Nome e indirizzo (min. 3 caratteri) obbligatori.");
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const row = { slug, name, description: str(fd, "description", 300) };
  const { error } = id && isUuid(id) ? await supabase.from("blog_categories").update(row).eq("id", id) : await supabase.from("blog_categories").insert(row);
  if (error) return fail(error.code === "23505" ? "Indirizzo già usato." : dbErrorMessage(error));
  refresh("blog", "sitemap");
  return ok("Categoria salvata.");
}

export async function saveOverride(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const path = str(fd, "path", 200);
  const title = str(fd, "title", 70);
  const description = str(fd, "description", 160);
  const canonical = str(fd, "canonical", 200);
  const e: Record<string, string> = {};
  if (!path || !PATH.test(path)) e.path = "Percorso del sito, es. /garages";
  if (title && title.length < 10) e.title = "Da 10 a 70 caratteri.";
  if (description && description.length < 50) e.description = "Da 50 a 160 caratteri.";
  if (canonical && !PATH.test(canonical)) e.canonical = "Percorso interno.";
  if (Object.keys(e).length) return fail("Controlla i campi.", e);
  const supabase = await createClient();
  const { error } = await supabase.from("seo_overrides").upsert({ path: path!, title, description, canonical, noindex: fd.get("noindex") === "on", note: str(fd, "note", 300) }, { onConflict: "path" });
  if (error) return fail(dbErrorMessage(error));
  refresh("seo", "sitemap");
  return ok("Meta salvati. Le pagine si aggiornano entro qualche minuto.");
}

export async function deleteOverride(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const path = str(fd, "path", 200);
  if (!path) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("seo_overrides").delete().eq("path", path);
  if (error) return fail(dbErrorMessage(error));
  refresh("seo", "sitemap");
  return ok("Override rimosso: la pagina usa di nuovo i meta predefiniti.");
}

export async function saveRedirect(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const from = str(fd, "from_path", 200)?.toLowerCase();
  const to = str(fd, "to_path", 300);
  const code = Number(fd.get("status_code"));
  if (!from || !/^\/[a-z0-9/_.-]{1,199}$/.test(from)) return fail("Origine non valida.", { from_path: "Percorso del sito, es. /vecchia-pagina" });
  if (!to || !(/^\/[a-z0-9/_?=&.-]{0,199}$/.test(to) && !to.startsWith("//")) && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[A-Za-z0-9/_?=&.-]*)?$/.test(to)) return fail("Destinazione non valida.", { to_path: "Percorso interno o indirizzo https://" });
  const supabase = await createClient();
  const { error } = await supabase.from("seo_redirects").insert({ from_path: from, to_path: to, status_code: [301, 302, 308].includes(code) ? code : 301, note: str(fd, "note", 300) });
  if (error) return fail(error.code === "23505" ? "Esiste già un redirect da questo percorso." : error.code === "22023" || error.code === "23514" ? (error.message.includes("check") ? "Percorso non ammesso (aree riservate escluse)." : error.message) : dbErrorMessage(error));
  refresh("seo");
  return ok("Redirect attivo (entro un minuto).");
}

export async function toggleRedirect(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const action = fd.get("action");
  const { error } = action === "delete" ? await supabase.from("seo_redirects").delete().eq("id", id) : await supabase.from("seo_redirects").update({ active: action === "on" }).eq("id", id);
  if (error) return fail(error.code === "22023" ? error.message : dbErrorMessage(error));
  refresh("seo");
  return ok(action === "delete" ? "Redirect eliminato." : action === "on" ? "Redirect attivato." : "Redirect disattivato.");
}

export async function saveRobotsExtra(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("seo.manage", S);
  const lines = (str(fd, "paths", 3000) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const bad = lines.filter((l) => !/^\/[a-z0-9/_-]{1,100}$/.test(l));
  if (bad.length) return fail(`Percorsi non validi: ${bad.slice(0, 3).join(", ")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_setting", { setting_key: "seo_robots_extra_disallow", setting_value: lines.slice(0, 50) as never });
  if (error) return fail(dbErrorMessage(error));
  refresh("seo");
  return ok("robots.txt aggiornato.");
}

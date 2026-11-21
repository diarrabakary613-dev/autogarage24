import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

/** Contenuto pubblicato dal CMS (solo testi semplici). null se non pubblicato: il sito usa i testi predefiniti. */
export async function getPublishedContent(key: string): Promise<Record<string, string> | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`content:${key}`, "content");
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("site_content").select("published").eq("key", key).maybeSingle();
  const p = data?.published;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  return Object.fromEntries(Object.entries(p).filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

/** FAQ dal CMS (coppie q1/a1…), oppure quelle predefinite. */
export async function getFaq(key: string, fallback: readonly { q: string; a: string }[]) {
  const c = await getPublishedContent(`faq.${key}`);
  if (!c) return fallback;
  const items = Array.from({ length: 6 }, (_, i) => ({ q: c[`q${i + 1}`], a: c[`a${i + 1}`] })).filter((x) => x.q && x.a) as { q: string; a: string }[];
  return items.length ? items : fallback;
}

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { RuleVersion } from "@/lib/neopatentati/engine";

/** Versioni pubblicate delle regole neopatentati (pubbliche, in cache, invalidate dal pannello). */
export async function getPublishedRuleVersions(): Promise<RuleVersion[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("neo-rules");
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("legal_rule_versions")
    .select("id, version_label, status, license_obtained_from, license_obtained_to, effective_from, effective_to, params, exceptions, sources, consulted_on, legal_rules!inner(code)")
    .eq("status", "pubblicata")
    .eq("legal_rules.code", "neopatentati_potenza_b")
    .order("effective_from", { ascending: false });
  return (data ?? []).map(({ legal_rules: _r, ...v }) => v as unknown as RuleVersion);
}

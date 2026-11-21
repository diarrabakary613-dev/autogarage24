#!/usr/bin/env node
/**
 * Test di verifica dopo la pubblicazione (smoke test).
 * Uso:   node scripts/smoke-test.mjs https://staging.<dominio>
 *        (o npm run smoke -- https://www.<dominio>)
 * Facoltativo, per controllare anche il servizio di autenticazione:
 *        NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... node scripts/smoke-test.mjs <url>
 *
 * Non crea account, non invia moduli, non scrive dati: solo letture.
 * Esce con codice 1 se un controllo fallisce.
 */
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const https = base.startsWith("https://");
let failed = 0;
const ok = (msg) => console.log(`✔ ${msg}`);
const ko = (msg) => { failed++; console.log(`✘ ${msg}`); };
const check = (cond, msg) => (cond ? ok(msg) : ko(msg));

async function get(path, opts = {}) {
  const t = Date.now();
  const res = await fetch(base + path, { redirect: "manual", ...opts });
  return { res, ms: Date.now() - t };
}

const PUBLIC_PAGES = [
  "/", "/auto-per-neopatentati", "/auto-usate", "/garages", "/meccanici", "/ricambi", "/trova-officina", "/offerte",
  "/servizi-auto", "/mappa", "/milano", "/partner", "/diventa-partner", "/professionisti", "/soccorso-stradale", "/trasporto-auto",
  "/revisione-auto", "/assicurazione-auto", "/valuta-la-tua-auto", "/blog", "/chi-siamo", "/contatti", "/assistenza",
  "/accedi", "/registrati", "/recupera-password", "/privacy", "/cookie", "/termini", "/note-legali",
];
const PROTECTED = ["/dashboard", "/admin", "/business", "/dashboard/messaggi", "/dashboard/supporto"];

console.log(`Smoke test su ${base}\n`);

// 1. Health check (applicazione + database)
try {
  const { res, ms } = await get("/api/health");
  const body = await res.json().catch(() => ({}));
  check(res.status === 200 && body.status === "ok" && body.database === "ok", `/api/health → ${res.status} ${JSON.stringify(body)} (${ms} ms)`);
} catch (e) { ko(`/api/health non raggiungibile: ${e.message}`); }

// 2. HTTPS e intestazioni di sicurezza
if (https) {
  try {
    const http = await fetch(base.replace("https://", "http://") + "/", { redirect: "manual" });
    check([301, 302, 307, 308].includes(http.status) && (http.headers.get("location") || "").startsWith("https://"), `HTTP reindirizza a HTTPS (${http.status})`);
  } catch (e) { ko(`verifica redirect HTTP→HTTPS non riuscita: ${e.message}`); }
}
{
  const { res } = await get("/");
  const h = res.headers;
  check(Boolean(h.get("content-security-policy")), "Content-Security-Policy presente");
  check(h.get("x-frame-options") === "DENY", "X-Frame-Options: DENY");
  check(h.get("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff");
  if (https) check((h.get("strict-transport-security") || "").includes("max-age"), "Strict-Transport-Security presente");
  check(!h.get("x-powered-by"), "nessuna intestazione X-Powered-By");
}

// 3. Pagine pubbliche
for (const p of PUBLIC_PAGES) {
  try {
    const { res, ms } = await get(p);
    const html = res.status === 200 ? await res.text() : "";
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    check(res.status === 200 && h1 === 1, `${p} → ${res.status}, h1=${h1} (${ms} ms)`);
  } catch (e) { ko(`${p} errore: ${e.message}`); }
}

// 4. Aree riservate: devono rimandare all'accesso
for (const p of PROTECTED) {
  const { res } = await get(p);
  const loc = res.headers.get("location") || "";
  check([302, 303, 307, 308].includes(res.status) && loc.includes("/accedi"), `${p} protetta → ${res.status} ${loc.replace(base, "")}`);
}

// 5. SEO tecnica
{
  const robots = await get("/robots.txt");
  const txt = robots.res.status === 200 ? await robots.res.text() : "";
  check(robots.res.status === 200 && /sitemap/i.test(txt), "/robots.txt presente con la sitemap");
  check(/Disallow:\s*\/admin/i.test(txt), "robots.txt esclude /admin");
  const sm = await get("/sitemap.xml");
  check(sm.res.status === 200 && (await sm.res.text()).includes("<urlset"), "/sitemap.xml valida");
  const nf = await get("/pagina-che-non-esiste-ag24");
  check(nf.res.status === 404, `pagina inesistente → ${nf.res.status}`);
}

// 6. Autenticazione Supabase (facoltativo)
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (sbUrl && sbKey) {
  try {
    const res = await fetch(`${sbUrl}/auth/v1/settings`, { headers: { apikey: sbKey } });
    const s = await res.json();
    check(res.status === 200, `servizio di autenticazione raggiungibile (${res.status})`);
    check(s.external?.email === true, "accesso con email attivo");
    check(s.mailer_autoconfirm === false, "conferma dell'email obbligatoria alla registrazione");
    const anonWrite = await fetch(`${sbUrl}/rest/v1/profiles`, { method: "POST", headers: { apikey: sbKey, "Content-Type": "application/json" }, body: "{}" });
    check(anonWrite.status === 401 || anonWrite.status === 403, `scrittura anonima su profiles rifiutata (${anonWrite.status})`);
  } catch (e) { ko(`verifica Supabase non riuscita: ${e.message}`); }
} else {
  console.log("· Controlli Supabase saltati (variabili NEXT_PUBLIC_SUPABASE_* non impostate)");
}

console.log(`\n${failed === 0 ? "TUTTI I CONTROLLI SUPERATI" : `${failed} CONTROLLI FALLITI`}`);
process.exit(failed === 0 ? 0 : 1);

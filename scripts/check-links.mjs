#!/usr/bin/env node
/**
 * Controlla tutti i collegamenti interni partendo dalla homepage.
 * Uso: avvia il sito (npm start) e poi: node scripts/check-links.mjs [http://localhost:3000]
 */
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const seen = new Map();
const queue = ["/"];
const skip = /^\/(_next|auth\/confirm)/;

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(base + path, { redirect: "manual" });
  seen.set(path, res.status);
  if (res.status !== 200 || !(res.headers.get("content-type") || "").includes("text/html")) continue;
  const html = await res.text();
  for (const m of html.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    if (!skip.test(href) && !seen.has(href) && !queue.includes(href)) queue.push(href);
  }
}

let broken = 0;
for (const [path, status] of [...seen].sort()) {
  const ok = status === 200 || status === 307 || status === 308;
  if (!ok) broken++;
  console.log(`${ok ? "✔" : "✘"} ${status} ${path}`);
}
console.log(`\n${seen.size} collegamenti controllati, ${broken} non funzionanti.`);
process.exit(broken ? 1 : 0);

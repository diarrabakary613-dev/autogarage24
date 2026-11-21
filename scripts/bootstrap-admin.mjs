#!/usr/bin/env node
/**
 * Nomina il PRIMO amministratore di AutoGarage24.
 *
 * Uso (dalla cartella del progetto, dopo esserti registrato sul sito):
 *   npm run admin:bootstrap -- tua@email.it
 *
 * Funziona una sola volta: se esiste già un amministratore, il database
 * rifiuta l'operazione. Gli amministratori successivi si nominano dal
 * pannello di amministrazione. Richiede SUPABASE_SECRET_KEY in .env.local
 * (chiave segreta: non condividerla mai).
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");

const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !email.includes("@")) {
  console.error("Indica l'email dell'account da promuovere: npm run admin:bootstrap -- tua@email.it");
  process.exit(1);
}
if (!url || !secret) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY in .env.local (vedi docs/ENVIRONMENT.md).");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.rpc("bootstrap_first_admin", { target_email: email });

if (error) {
  console.error(`Operazione non riuscita: ${error.message}`);
  process.exit(1);
}
console.log(`✔ ${email} è ora amministratore (id ${data}). Esci e rientra nel sito per vedere il pannello.`);

import { createClient } from "@/lib/supabase/client";
import { deviceClass } from "./attribution";

/** Segnala un errore del browser al registro errori (il database rimuove email, numeri e identificativi). */
export function reportClientError(error: Error & { digest?: string }) {
  try {
    const path = window.location.pathname;
    void createClient().rpc("report_client_error", {
      p_message: `${error.name}: ${error.message}`.slice(0, 300), p_path: /^\/[A-Za-z0-9/_.-]{0,199}$/.test(path) ? path : undefined,
      p_digest: error.digest && /^[A-Za-z0-9_-]{1,64}$/.test(error.digest) ? error.digest : undefined, p_device: deviceClass(),
    }).then(() => undefined, () => undefined);
  } catch {
    // Configurazione assente: nessuna segnalazione.
  }
}

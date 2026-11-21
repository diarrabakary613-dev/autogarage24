import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/password-forms";
import { t } from "@/i18n";

export const metadata: Metadata = { title: "Nuova password", robots: { index: false } };

/**
 * Raggiunta dal link dell'email di recupero (via /auth/confirm, che crea
 * la sessione). Il proxy rimanda all'accesso chi arriva senza sessione;
 * l'azione verifica di nuovo la sessione lato server.
 */
export default function UpdatePasswordPage() {
  return (
    <AuthCard title={t.auth.updateTitle} subtitle="Scegli una password che non usi su altri siti.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}

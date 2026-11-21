import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetRequestForm } from "@/components/auth/password-forms";
import { t } from "@/i18n";

export const metadata: Metadata = { title: "Recupera la password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title={t.auth.resetTitle}
      subtitle={t.auth.resetSubtitle}
      footer={
        <Link href="/accedi" className="font-semibold text-orange-700 hover:underline">
          Torna all&apos;accesso
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}

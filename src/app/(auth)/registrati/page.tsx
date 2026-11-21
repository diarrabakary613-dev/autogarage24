import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/feedback";
import { t } from "@/i18n";

export const metadata: Metadata = {
  title: "Registrati",
  description: "Crea gratuitamente il tuo account AutoGarage24, come cliente o come professionista dell'automobile.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href="/accedi" className="font-semibold text-orange-700 hover:underline">
            {t.nav.login}
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}

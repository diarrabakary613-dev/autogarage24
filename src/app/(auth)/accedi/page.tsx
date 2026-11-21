import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/feedback";
import { t } from "@/i18n";

export const metadata: Metadata = {
  title: "Accedi",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthCard
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href="/registrati" className="font-semibold text-orange-700 hover:underline">
            {t.nav.register}
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-13" />
    </div>
  );
}

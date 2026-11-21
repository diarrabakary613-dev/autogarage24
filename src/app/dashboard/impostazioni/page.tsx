import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bell, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Impostazioni", robots: { index: false } };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Impostazioni" description="Dati del profilo, sicurezza, notifiche e privacy." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  const user = await requireUser("/dashboard/impostazioni");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, city, postal_code, marketing_consent, created_at")
    .eq("id", user.id)
    .single();

  const links = [
    { href: "/dashboard/impostazioni/notifiche", label: "Preferenze di notifica", text: "Scegli cosa ricevere in-app e via email.", icon: Bell },
    { href: "/dashboard/impostazioni/privacy", label: "Privacy e dati personali", text: "Esporta i tuoi dati o richiedi la cancellazione.", icon: Lock },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <h2 className="mb-1 text-lg font-bold">Dati del profilo</h2>
        <p className="mb-6 text-sm text-muted">Questi dati sono privati: li vedi solo tu e, se necessario, l&apos;amministrazione.</p>
        <ProfileForm
          defaults={{
            fullName: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            city: profile?.city ?? "",
            postalCode: profile?.postal_code ?? "",
            marketingConsent: profile?.marketing_consent ?? false,
          }}
        />
      </Card>
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Il tuo account</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Email</dt>
            <dd className="truncate font-medium text-ink">{user.email}</dd>
            <dt className="text-muted">Iscritto dal</dt>
            <dd className="font-medium text-ink">{formatDate(profile?.created_at)}</dd>
            <dt className="text-muted">Ruoli</dt>
            <dd className="flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <Badge key={r}>{ROLE_LABELS[r]}</Badge>
              ))}
            </dd>
          </dl>
          <ButtonLink href="/aggiorna-password" variant="outline" size="sm" className="mt-5" icon={<ShieldCheck className="size-4" aria-hidden />}>
            Cambia password
          </ButtonLink>
        </Card>
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {links.map(({ href, label, text, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-6 py-4 hover:bg-mist/60">
                  <Icon className="size-5 text-orange-700" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{label}</span>
                    <span className="text-sm text-muted">{text}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

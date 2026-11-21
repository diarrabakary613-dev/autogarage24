import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveNotificationPreferences } from "@/lib/actions/messaging";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Preferenze notifiche", robots: { index: false } };
const EMAIL_DEFAULT = ["richieste", "preventivi", "appuntamenti", "manutenzione", "account"];

export default function NotificationPrefsPage() {
  return (
    <>
      <PageHeader title="Preferenze notifiche" description="Scegli quali aggiornamenti ricevere nell'area personale e via email. Le comunicazioni di servizio sull'account restano sempre attive." />
      <Suspense fallback={<Skeleton className="h-96" />}><Prefs /></Suspense>
    </>
  );
}

async function Prefs() {
  const user = await requireUser("/dashboard/impostazioni/notifiche");
  const supabase = await createClient();
  const [{ data: p }, { data: profile }] = await Promise.all([
    supabase.from("notification_preferences").select("in_app, email").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("marketing_consent").eq("id", user.id).maybeSingle(),
  ]);
  const inApp = (p?.in_app ?? {}) as Record<string, boolean>;
  const email = (p?.email ?? {}) as Record<string, boolean>;
  return (
    <Card className="p-6">
      <ActionForm action={saveNotificationPreferences} submitLabel="Salva preferenze">
        <table className="w-full text-sm">
          <caption className="sr-only">Notifiche per categoria</caption>
          <thead><tr className="text-left text-muted"><th scope="col" className="py-2">Categoria</th><th scope="col" className="py-2">Nell&apos;area personale</th><th scope="col" className="py-2">Email</th></tr></thead>
          <tbody>
            {Object.entries(NOTIFICATION_CATEGORY_LABELS).map(([k, l]) => {
              const service = k === "account" || k === "amministrazione";
              return (
                <tr key={k} className="border-t border-line">
                  <th scope="row" className="py-3 text-left font-medium">{l}{service && <span className="block text-xs font-normal text-muted">Comunicazioni di servizio</span>}</th>
                  <td className="py-3"><Checkbox id={`a-${k}`} name={`app_${k}`} defaultChecked={service || (inApp[k] ?? true)} disabled={service} label={<span className="sr-only">{l} in-app</span>} /></td>
                  <td className="py-3"><Checkbox id={`m-${k}`} name={`mail_${k}`} defaultChecked={email[k] ?? EMAIL_DEFAULT.includes(k)} label={<span className="sr-only">{l} via email</span>} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 rounded-xl bg-mist p-4">
          <Checkbox id="mk" name="marketing" defaultChecked={profile?.marketing_consent ?? false} label="Accetto di ricevere comunicazioni promozionali e novità di AutoGarage24 (facoltativo, revocabile in qualsiasi momento)." />
        </div>
      </ActionForm>
      <Alert tone="info" className="mt-4">Le email vengono inviate solo quando il servizio email è configurato dall&apos;amministrazione. Non usiamo i tuoi consensi per finalità diverse da quelle indicate.</Alert>
    </Card>
  );
}

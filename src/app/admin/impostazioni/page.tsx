import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminSetSetting } from "@/lib/actions/offers";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Impostazioni della piattaforma", robots: { index: false } };

export default function SettingsPage() {
  return <AdminPage title="Impostazioni della piattaforma" description="Regole configurabili: approvazione delle offerte, annunci dei privati, parametri della stima interna delle auto. Ogni modifica è registrata nel registro attività."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("settings.manage", "/admin/impostazioni");
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*").order("key");
  return (
    <ul className="flex flex-col gap-3">{(data ?? []).map((s) => (
      <li key={s.key}><Card className="p-4">
        <p className="font-semibold">{s.description}</p>
        <p className="text-xs text-muted"><code>{s.key}</code> · aggiornato {formatDateTime(s.updated_at)}</p>
        <ActionForm action={adminSetSetting} submitLabel="Salva" size="sm" hidden={{ key: s.key }} className="mt-2 flex flex-wrap items-end gap-2">
          <Input name="value" aria-label={`Valore di ${s.key}`} defaultValue={JSON.stringify(s.value)} className="w-full max-w-xl font-mono" />
        </ActionForm>
      </Card></li>
    ))}</ul>
  );
}

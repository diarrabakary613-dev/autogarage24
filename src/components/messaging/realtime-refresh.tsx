"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Aggiorna contatori e badge quando arrivano nuove notifiche o messaggi (Realtime, filtrato per utente). */
export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => { if (t) clearTimeout(t); t = setTimeout(() => router.refresh(), 800); };
    const ch = supabase.channel(`user:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, [userId, router]);
  return null;
}

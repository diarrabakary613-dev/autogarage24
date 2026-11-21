import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavLinks, type NavGroup } from "./dashboard-nav-links";
import { RealtimeRefresh } from "@/components/messaging/realtime-refresh";

/** Menu dell'area personale, adattato ai ruoli dell'utente. Conteggi reali dal database. */
export async function DashboardNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();

  const [{ count: unreadNotifications }, { data: parts }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).is("archived_at", null),
    supabase.from("conversation_participants").select("conversation_id, last_read_at, conversations(last_message_at)").eq("user_id", user.id),
  ]);
  const unreadMessages = (parts ?? []).filter((p) => {
    const last = (p.conversations as unknown as { last_message_at: string } | null)?.last_message_at;
    return last && (!p.last_read_at || new Date(last) > new Date(p.last_read_at));
  }).length;

  const r = user.roles;
  const groups: NavGroup[] = [
    {
      title: "Generale",
      items: [
        { href: "/dashboard", label: "Panoramica", icon: "home" },
        { href: "/dashboard/messaggi", label: "Messaggi", icon: "messages", badge: unreadMessages },
        { href: "/dashboard/notifiche", label: "Notifiche", icon: "bell", badge: unreadNotifications ?? 0 },
        { href: "/dashboard/richieste", label: "Richieste", icon: "inbox" },
        { href: "/dashboard/appuntamenti", label: "Appuntamenti", icon: "calendar" },
        { href: "/dashboard/prenotazioni", label: "Visite e test drive", icon: "calendar" },
        { href: "/dashboard/le-mie-offerte", label: "Le mie offerte", icon: "package" },
        { href: "/dashboard/rewards", label: "Rewards e inviti", icon: "star" },
        { href: "/dashboard/attivita", label: "Attività", icon: "activity" },
      ],
    },
    {
      title: "Automobili",
      items: [
        { href: "/dashboard/preferiti", label: "Preferiti", icon: "heart" },
        { href: "/dashboard/annunci", label: "I miei annunci", icon: "car" },
        { href: "/dashboard/statistiche-annunci", label: "Statistiche annunci", icon: "chart" },
        { href: "/dashboard/disponibilita", label: "Orari per le visite", icon: "calendar" },
        { href: "/dashboard/neopatentato", label: "Profilo neopatentato", icon: "key" },
      ],
    },
    {
      title: "Il mio garage",
      items: [
        { href: "/dashboard/garage-auto", label: "Le mie auto", icon: "garage" },
        { href: "/dashboard/scadenze", label: "Scadenze", icon: "calendar" },
        { href: "/dashboard/richieste-intervento", label: "Richieste di intervento", icon: "wrench" },
        { href: "/dashboard/manutenzione", label: "Manutenzione", icon: "wrench" },
        { href: "/dashboard/documenti-auto", label: "Documenti", icon: "file" },
        { href: "/dashboard/assistenza-auto", label: "Assistenza auto", icon: "lifebuoy" },
        { href: "/dashboard/soccorso", label: "Assistenza stradale", icon: "lifebuoy" },
        { href: "/dashboard/trasporti", label: "Trasporti auto", icon: "car" },
        { href: "/dashboard/revisioni", label: "Revisioni", icon: "calendar" },
        { href: "/dashboard/assicurazioni", label: "Richieste assicurative", icon: "file" },
        { href: "/dashboard/valutazioni", label: "Valutazioni e permute", icon: "chart" },
      ],
    },
  ];
  const { data: businesses } = await supabase.rpc("my_businesses");
  if (businesses?.length) groups.push({ title: "Business Center", items: [{ href: "/business", label: "AutoGarage24 Business Center", icon: "chart" }] });
  else {
    const { count: invites } = await supabase.from("business_members").select("id", { count: "exact", head: true }).eq("status", "invitato");
    if (invites) groups.push({ title: "Business Center", items: [{ href: "/business/benvenuto", label: "Inviti al team", icon: "users", badge: invites }] });
  }
  if (user.isProfessional) {
    const pro: NavGroup = { title: "Attività professionale", items: [] };
    if (r.includes("officina")) pro.items.push({ href: "/dashboard/garage", label: "Dashboard officina", icon: "building" });
    if (r.includes("meccanico")) pro.items.push({ href: "/dashboard/meccanico", label: "Dashboard meccanico", icon: "cog" });
    if (r.includes("venditore_ricambi")) pro.items.push({ href: "/dashboard/venditore-ricambi", label: "Dashboard ricambi", icon: "package" });
    if (r.includes("soccorritore") || r.includes("officina") || r.includes("meccanico")) pro.items.push({ href: "/dashboard/soccorso/operatore", label: "Operatore soccorso", icon: "lifebuoy" });
    if (r.includes("trasportatore") || r.includes("soccorritore") || r.includes("venditore_auto")) pro.items.push({ href: "/dashboard/trasporti/operatore", label: "Trasportatore", icon: "car" });
    if (r.includes("centro_revisione") || r.includes("officina")) pro.items.push({ href: "/dashboard/revisioni/centro", label: "Centro revisioni", icon: "calendar" });
    if (r.includes("venditore_auto") || r.includes("officina")) pro.items.push({ href: "/dashboard/valutazioni/professionista", label: "Valutazioni ricevute", icon: "chart" });
    if (r.includes("intermediario_assicurativo")) pro.items.push({ href: "/dashboard/assicurazioni/partner", label: "Richieste assicurative", icon: "file" });
    pro.items.push(
      { href: "/dashboard/profilo-professionale", label: "Profilo professionale", icon: "badge" },
      { href: "/dashboard/servizi", label: "Servizi", icon: "list" },
      { href: "/dashboard/offerte", label: "Offerte e coupon", icon: "package" },
      { href: "/dashboard/rewards/partner", label: "Premi Rewards", icon: "star" },
      { href: "/dashboard/ricambi", label: "I miei ricambi", icon: "package" },
      { href: "/dashboard/recensioni", label: "Recensioni", icon: "star" },
    );
    groups.push(pro);
  }
  groups.push({
    title: "Account",
    items: [
      { href: "/dashboard/impostazioni", label: "Impostazioni", icon: "settings" },
      { href: "/dashboard/supporto", label: "Assistenza AutoGarage24", icon: "help" },
      ...(user.isStaff ? [{ href: "/admin", label: "Pannello amministrativo", icon: "shield" as const }] : []),
    ],
  });

  return (
    <>
      <RealtimeRefresh userId={user.id} />
      <DashboardNavLinks groups={groups} />
    </>
  );
}

import { getCurrentUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";
import { DashboardNavLinks, type NavGroup, type NavItem } from "@/components/dashboard/dashboard-nav-links";

const ITEMS: (NavItem & { perm?: Permission })[] = [
  { href: "/admin", label: "Panoramica", icon: "home", perm: "stats.view" },
  { href: "/admin/utenti", label: "Utenti e ruoli", icon: "shield", perm: "users.view" },
  { href: "/admin/lancio", label: "Cruscotto di lancio", icon: "chart", perm: "analytics.view" },
  { href: "/admin/analytics", label: "Analytics e risultati", icon: "chart", perm: "analytics.view" },
  { href: "/admin/acquisizione", label: "Acquisizione partner (CRM)", icon: "target", perm: "acquisition.manage" },
  { href: "/admin/growth", label: "Growth Center", icon: "chart", perm: "growth.manage" },
  { href: "/admin/marketing", label: "Centro marketing", icon: "megaphone", perm: "marketing.manage" },
  { href: "/admin/professionisti", label: "Officine e professionisti", icon: "users", perm: "professionals.verify" },
  { href: "/admin/offerte", label: "Offerte e coupon", icon: "package", perm: "offers.moderate" },
  { href: "/admin/prenotazioni", label: "Prenotazioni auto", icon: "calendar", perm: "bookings.manage" },
  { href: "/admin/servizi", label: "Soccorso, trasporti, revisioni", icon: "lifebuoy", perm: "services.manage" },
  { href: "/admin/assicurazioni", label: "Partner assicurativi", icon: "shield", perm: "insurance.manage" },
  { href: "/admin/valutazioni", label: "Valutazioni e permute", icon: "chart", perm: "valuations.manage" },
  { href: "/admin/business", label: "Business Center", icon: "building", perm: "business.manage" },
  { href: "/admin/rewards", label: "Rewards e inviti", icon: "star", perm: "rewards.manage" },
  { href: "/admin/impostazioni", label: "Impostazioni", icon: "settings", perm: "settings.manage" },
  { href: "/admin/moderazione", label: "Moderazione annunci", icon: "car", perm: "listings.moderate" },
  { href: "/admin/verifiche", label: "Verifica professionisti", icon: "badge", perm: "professionals.verify" },
  { href: "/admin/segnalazioni", label: "Segnalazioni", icon: "bell", perm: "reports.manage" },
  { href: "/admin/recensioni", label: "Recensioni", icon: "star", perm: "reviews.moderate" },
  { href: "/admin/supporto", label: "Assistenza clienti", icon: "lifebuoy", perm: "support.manage" },
  { href: "/admin/field-manager", label: "Field Manager", icon: "building", perm: "field.manage" },
  { href: "/admin/neopatentati", label: "Regole neopatentati", icon: "key", perm: "neo_rules.manage" },
  { href: "/admin/contenuti", label: "Contenuti del sito", icon: "file", perm: "content.manage" },
  { href: "/admin/seo", label: "SEO Manager", icon: "target", perm: "seo.manage" },
  { href: "/admin/categorie", label: "Categorie", icon: "list", perm: "categories.manage" },
  { href: "/admin/piani", label: "Piani commerciali", icon: "package", perm: "plans.manage" },
  { href: "/admin/gdpr", label: "Privacy e cancellazioni", icon: "settings", perm: "gdpr.manage" },
  { href: "/admin/sistema", label: "Email e sistema", icon: "activity", perm: "stats.view" },
  { href: "/admin/audit", label: "Registro attività", icon: "inbox", perm: "audit.view" },
];

export async function AdminNav() {
  const user = await getCurrentUser();
  if (!user?.isStaff) return null;
  const items = ITEMS.filter((i) => !i.perm || user.permissions.includes(i.perm)).map(({ perm: _p, ...i }) => i);
  const groups: NavGroup[] = [{ title: "Amministrazione", items }, { title: "Area personale", items: [{ href: "/dashboard", label: "Torna alla mia area", icon: "home" }] }];
  return <DashboardNavLinks groups={groups} />;
}

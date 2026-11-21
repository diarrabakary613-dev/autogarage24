import { DashboardNavLinks, type NavGroup } from "@/components/dashboard/dashboard-nav-links";
import { selectBusiness } from "@/lib/actions/business";
import { findBusinessContext } from "@/lib/business/context";

/** Menu del Business Center: voci in base ai permessi del ruolo nell'azienda attiva. */
export async function BusinessNav() {
  const ctx = await findBusinessContext();
  if (!ctx) return <DashboardNavLinks groups={[{ title: "Area personale", items: [{ href: "/dashboard", label: "Torna all'area personale", icon: "home" }] }]} />;
  const { list, current, can } = ctx;
  const items: NavGroup["items"] = [{ href: "/business", label: "Panoramica", icon: "home" }];
  if (can("lead")) items.push({ href: "/business/lead", label: "Contatti e clienti", icon: "inbox" });
  if (can("prenotazioni")) items.push({ href: "/business/prenotazioni", label: "Prenotazioni", icon: "calendar" });
  if (can("attivita")) items.push({ href: "/business/attivita", label: "Attività", icon: "list" });
  if (can("statistiche")) items.push({ href: "/business/statistiche", label: "Statistiche", icon: "chart" });
  if (can("esportazioni")) items.push({ href: "/business/report", label: "Report ed esportazioni", icon: "file" });
  items.push({ href: "/business/gestione", label: "Servizi e annunci", icon: "package" });
  items.push({ href: "/business/presenza", label: "Migliora la presenza", icon: "star" });
  if (can("team")) items.push({ href: "/business/team", label: "Team", icon: "users" });
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-ink p-4 text-white">
        <p className="text-xs tracking-widest text-orange uppercase">Business Center</p>
        <p className="font-bold">{current.display_name}</p>
        <p className="text-xs opacity-80">{current.role === "proprietario" ? "Titolare" : current.role}</p>
        {list.length > 1 && (
          <form action={selectBusiness} className="mt-2 flex gap-2">
            <label className="sr-only" htmlFor="biz-sel">Azienda</label>
            <select id="biz-sel" name="profile_id" defaultValue={current.profile_id} className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm text-ink">{list.map((b) => <option key={b.profile_id} value={b.profile_id}>{b.display_name}</option>)}</select>
            <button className="rounded-md bg-orange px-2 text-sm font-semibold text-ink">Vai</button>
          </form>
        )}
      </div>
      <DashboardNavLinks groups={[{ title: "Azienda", items }, { title: "Area personale", items: [{ href: "/dashboard", label: "Torna all'area personale", icon: "home" }] }]} />
    </div>
  );
}

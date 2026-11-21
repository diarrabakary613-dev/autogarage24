"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BadgeCheck, Bell, Building2, CalendarDays, Car, Cog, FileText, Heart, HelpCircle, Home, Inbox, KeyRound, LifeBuoy, List,
  MessagesSquare, Package, Settings, ShieldCheck, Star, Warehouse, Wrench, type LucideIcon, Target, Megaphone, BarChart3, Map as MapIcon, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home, messages: MessagesSquare, bell: Bell, inbox: Inbox, activity: Activity, heart: Heart, car: Car, key: KeyRound,
  garage: Warehouse, wrench: Wrench, file: FileText, lifebuoy: LifeBuoy, building: Building2, cog: Cog, package: Package,
  badge: BadgeCheck, list: List, star: Star, settings: Settings, help: HelpCircle, shield: ShieldCheck, calendar: CalendarDays,
  target: Target, megaphone: Megaphone, chart: BarChart3, map: MapIcon, users: Users,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

function active(pathname: string, href: string) {
  return href === "/dashboard" || href === "/business" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);
  return (
    <aside aria-label="Menu dell'area personale">
      {/* Smartphone e tablet: elenco scorrevole */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {all.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active(pathname, it.href) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap",
              active(pathname, it.href) ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-graphite",
            )}
          >
            {it.label}
            {it.badge ? <span className="rounded-full bg-orange px-1.5 text-xs text-ink">{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
      {/* Desktop */}
      <nav className="sticky top-24 hidden flex-col gap-5 lg:flex">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-xs font-bold tracking-wider text-muted uppercase">{g.title}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const Icon = ICONS[it.icon];
                const on = active(pathname, it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        on ? "bg-white text-ink shadow-card" : "text-graphite hover:bg-white/70 hover:text-ink",
                      )}
                    >
                      <Icon className={cn("size-4", on ? "text-orange-700" : "text-muted")} aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      {it.badge ? (
                        <span className="rounded-full bg-orange px-1.5 text-xs font-bold text-ink" aria-label={`${it.badge} da leggere`}>
                          {it.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

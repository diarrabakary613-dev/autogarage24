"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Voci di menu con evidenziazione della pagina corrente (aria-current). */
export function NavLinks({ items, variant }: { items: NavItem[]; variant: "desktop" | "mobile" }) {
  return <NavList items={items} variant={variant} pathname={usePathname()} />;
}

/** Versione senza evidenziazione, usata mentre la pagina dinamica viene trasmessa. */
export function NavLinksStatic({ items, variant }: { items: NavItem[]; variant: "desktop" | "mobile" }) {
  return <NavList items={items} variant={variant} pathname="" />;
}

function NavList({ items, variant, pathname }: { items: NavItem[]; variant: "desktop" | "mobile"; pathname: string }) {
  return (
    <ul className={variant === "desktop" ? "flex items-center gap-0.5" : "flex flex-col"}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                variant === "desktop"
                  ? "relative rounded-md px-2.5 py-2 text-[0.9rem] font-medium whitespace-nowrap transition-colors hover:text-ink 2xl:px-3"
                  : "flex items-center justify-between rounded-lg px-3 py-3.5 text-base font-semibold hover:bg-mist",
                active ? "text-ink" : variant === "desktop" ? "text-graphite/80" : "text-ink",
                variant === "desktop" &&
                  active &&
                  "after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-orange",
                variant === "mobile" && active && "bg-orange-50 text-orange-700",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

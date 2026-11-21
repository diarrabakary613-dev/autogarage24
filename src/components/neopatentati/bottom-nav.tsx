import Link from "next/link";
import { PenSquare, Search, SearchCheck, Star, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "cerca" | "ricerche";

const TABS = [
  { key: "cerca", href: "/auto-per-neopatentati#cerca", label: "Cerca", Icon: Search },
  { key: "preferiti", href: "/dashboard/preferiti", label: "Preferiti", Icon: Star },
  { key: "ricerche", href: "/auto-per-neopatentati/ricerche-salvate", label: "Ricerche salvate", Icon: SearchCheck },
  { key: "vendi", href: "/dashboard/annunci/nuovo", label: "Vendi", Icon: PenSquare },
  { key: "profilo", href: "/dashboard/impostazioni", label: "Profilo", Icon: UserRound },
] as const;

/**
 * Barra di navigazione in basso, in stile app, per l'area auto per neopatentati.
 * Preferiti, Vendi e Profilo richiedono l'accesso: chi non è collegato passa dalla pagina di accesso e poi torna qui.
 */
export function NeoBottomNav({ active }: { active: Tab }) {
  return (
    <>
      <div aria-hidden className="h-28" />
      <nav aria-label="Navigazione auto per neopatentati" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-xl rounded-full border border-white/10 bg-ink/90 p-1.5 text-white shadow-lift backdrop-blur-md supports-[padding:max(0px)]:bottom-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ul className="grid grid-cols-5">
          {TABS.map(({ key, href, label, Icon }) => {
            const current = key === active;
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-full px-1 py-2 text-[11px] leading-tight font-medium transition sm:text-xs",
                    current ? "bg-white/15 text-white" : "text-white/75 hover:text-white",
                    key === "vendi" && !current && "text-orange hover:text-orange",
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                  <span className="text-center">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

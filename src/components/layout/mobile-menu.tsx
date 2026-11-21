"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { t } from "@/i18n";

/**
 * Menu a scomparsa per smartphone e tablet.
 * Chiusura con ESC, al cambio pagina e blocco dello scroll di sfondo.
 * Il pannello è montato in <body> (portal): l'header usa backdrop-filter,
 * che altrimenti limiterebbe il posizionamento "fixed" all'header stesso.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  const [top, setTop] = useState(64);

  function toggle() {
    // Il pannello parte esattamente sotto l'header (che può avere sopra la barra superiore).
    const header = buttonRef.current?.closest("header");
    if (header) setTop(Math.max(0, header.getBoundingClientRect().bottom));
    setOpen((v) => !v);
  }

  // Chiude il menu quando cambia la pagina.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
        className="grid size-11 place-items-center rounded-md text-ink transition-colors hover:bg-mist"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open &&
        createPortal(
          <div
            id={panelId}
            style={{ top }}
            className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto border-t border-line bg-white px-4 pt-4 pb-10 xl:hidden"
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

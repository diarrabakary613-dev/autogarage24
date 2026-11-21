import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Azioni dell'utente nell'header: cambia in base allo stato di accesso
 * e al ruolo. Legge la sessione, quindi va sempre dentro <Suspense>.
 */
export async function UserNav({ layout = "row" }: { layout?: "row" | "column" }) {
  const user = await getCurrentUser();
  const wrap = layout === "row" ? "flex items-center gap-2" : "flex flex-col gap-2";
  const full = layout === "column" ? "w-full" : undefined;

  if (!user) {
    return (
      <div className={wrap}>
        <ButtonLink href="/accedi" variant="ghost" size="sm" className={full}>
          {t.nav.login}
        </ButtonLink>
        <ButtonLink href="/registrati" variant="primary" size="sm" className={full}>
          {t.nav.register}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={wrap}>
      {user.isAdmin && (
        <ButtonLink
          href="/admin"
          variant="ghost"
          size="sm"
          className={full}
          icon={<ShieldCheck className="size-4" aria-hidden />}
        >
          {t.nav.admin}
        </ButtonLink>
      )}
      <ButtonLink
        href="/dashboard"
        variant="outline"
        size="sm"
        className={full}
        icon={<LayoutDashboard className="size-4" aria-hidden />}
      >
        {t.nav.dashboard}
      </ButtonLink>
      <form action={signOutAction} className={full}>
        <button type="submit" className={cn(buttonClasses("ghost", "sm"), full)}>
          <LogOut className="size-4" aria-hidden />
          {t.nav.logout}
        </button>
      </form>
    </div>
  );
}

export function UserNavFallback() {
  return <div className="h-9 w-40 animate-pulse rounded-md bg-mist" aria-hidden />;
}

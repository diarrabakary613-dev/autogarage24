import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Container } from "@/components/ui/feedback";
import { getPublishedContent } from "@/lib/data/content";

/** Avviso importante pubblicato dal CMS (nessun HTML: solo testo e un collegamento interno). */
export async function Announcement() {
  const c = await getPublishedContent("home.announcement");
  if (!c?.text) return null;
  return (
    <div className="bg-orange text-ink" role="region" aria-label="Avviso">
      <Container className="flex flex-wrap items-center justify-center gap-2 py-2.5 text-center text-sm font-semibold">
        <Megaphone className="size-4" aria-hidden /> {c.text}
        {c.link && <Link href={c.link} className="underline">{c.linkLabel ?? "Scopri di più"}</Link>}
      </Container>
    </div>
  );
}

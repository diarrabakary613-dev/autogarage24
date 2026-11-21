import { TabLinks } from "@/components/ui/misc";

export function MaintenanceTabs({ current }: { current: string }) {
  return (
    <TabLinks
      current={current}
      items={[
        { key: "panoramica", label: "Panoramica e promemoria", href: "/dashboard/manutenzione" },
        { key: "storico", label: "Storico interventi", href: "/dashboard/manutenzione/storico" },
        { key: "costi", label: "Costi", href: "/dashboard/manutenzione/costi" },
        { key: "documenti", label: "Documenti", href: "/dashboard/documenti-auto" },
      ]}
    />
  );
}

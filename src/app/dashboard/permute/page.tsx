import { redirect } from "next/navigation";

/** Le permute sono elencate in «Le mie valutazioni». */
export default function TradeInsIndex() {
  redirect("/dashboard/valutazioni?vista=permute");
}

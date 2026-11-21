/**
 * Test z a due proporzioni (bilaterale, alfa 0,05). Serve a non dichiarare
 * vincente una variante quando la differenza può essere dovuta al caso.
 */
export function significance(nA: number | null, cA: number | null, nB: number | null, cB: number | null): { verdict: "dati_insufficienti" | "non_significativa" | "significativa"; text: string; z: number | null } {
  if (!nA || !nB || cA === null || cB === null || nA < 100 || nB < 100) {
    return { verdict: "dati_insufficienti", z: null, text: "Dati insufficienti: servono almeno 100 osservazioni per variante prima di trarre conclusioni." };
  }
  if (cA > nA || cB > nB) return { verdict: "dati_insufficienti", z: null, text: "Le conversioni non possono superare le osservazioni: controlla i numeri." };
  const pA = cA / nA, pB = cB / nB, p = (cA + cB) / (nA + nB);
  const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  if (se === 0) return { verdict: "non_significativa", z: 0, text: "Nessuna differenza misurabile tra le varianti." };
  const z = (pB - pA) / se;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  if (Math.abs(z) < 1.96) return { verdict: "non_significativa", z, text: `A ${pct(pA)} contro B ${pct(pB)}: differenza non statisticamente significativa (|z| = ${Math.abs(z).toFixed(2)} < 1,96). Non dichiarare una vincitrice.` };
  return { verdict: "significativa", z, text: `A ${pct(pA)} contro B ${pct(pB)}: differenza significativa al 95% a favore di ${z > 0 ? "B" : "A"} (|z| = ${Math.abs(z).toFixed(2)}).` };
}

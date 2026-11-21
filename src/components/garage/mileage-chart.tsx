/** Andamento del chilometraggio (SVG accessibile, solo dati registrati). Le letture incoerenti sono evidenziate. */
export function MileageChart({ points }: { points: { date: string; km: number; bad: boolean }[] }) {
  if (points.length < 2) return <p className="text-sm text-muted">Servono almeno due letture per mostrare l&apos;andamento.</p>;
  const W = 600, H = 200, P = 36;
  const t = points.map((p) => new Date(p.date).getTime());
  const minT = Math.min(...t), maxT = Math.max(...t) || minT + 1;
  const minK = Math.min(...points.map((p) => p.km)), maxK = Math.max(...points.map((p) => p.km));
  const x = (v: number) => P + ((v - minT) / Math.max(1, maxT - minT)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - minK) / Math.max(1, maxK - minK)) * (H - 2 * P);
  const good = points.filter((p) => !p.bad);
  const path = good.map((p, i) => `${i ? "L" : "M"}${x(new Date(p.date).getTime()).toFixed(1)},${y(p.km).toFixed(1)}`).join(" ");
  const fmt = (n: number) => n.toLocaleString("it-IT");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Chilometraggio da ${fmt(minK)} a ${fmt(maxK)} km in ${points.length} letture`}>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#d9dbe0" />
        <text x={P} y={H - 10} fontSize="11" fill="#666a73">{new Date(minT).toLocaleDateString("it-IT")}</text>
        <text x={W - P} y={H - 10} fontSize="11" fill="#666a73" textAnchor="end">{new Date(maxT).toLocaleDateString("it-IT")}</text>
        <text x={4} y={y(maxK) + 4} fontSize="11" fill="#666a73">{fmt(maxK)}</text>
        <text x={4} y={y(minK) + 4} fontSize="11" fill="#666a73">{fmt(minK)}</text>
        <path d={path} fill="none" stroke="#F47B20" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={x(new Date(p.date).getTime())} cy={y(p.km)} r={p.bad ? 5 : 3.5} fill={p.bad ? "#c92a2a" : "#111318"}><title>{`${new Date(p.date).toLocaleDateString("it-IT")}: ${fmt(p.km)} km${p.bad ? " (incoerente)" : ""}`}</title></circle>)}
      </svg>
      {points.some((p) => p.bad) && <figcaption className="text-xs text-danger">I punti rossi sono letture incoerenti con le altre: verifica il dato. Non vengono usate per il chilometraggio attuale.</figcaption>}
    </figure>
  );
}

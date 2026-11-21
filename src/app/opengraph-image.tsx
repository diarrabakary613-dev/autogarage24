import { ImageResponse } from "next/og";

export const alt = "AutoGarage24 — Tutto il mondo dell'automobile. In un unico posto.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Immagine di anteprima per la condivisione sui social (generata, nessuna foto di terzi). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(circle at 85% 15%, rgba(244,123,32,0.45), #111318 55%)",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#F47B20",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            24
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, display: "flex" }}>
            AutoGarage<span style={{ color: "#F47B20" }}>24</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, display: "flex", flexDirection: "column" }}>
            <span>Tutto il mondo dell&apos;automobile.</span>
            <span style={{ color: "#F47B20" }}>In un unico posto.</span>
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.72)" }}>
            Auto per neopatentati · Auto usate · Officine · Meccanici · Ricambi
          </div>
        </div>
      </div>
    ),
    size,
  );
}

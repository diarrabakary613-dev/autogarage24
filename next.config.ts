import type { NextConfig } from "next";

/** Intestazioni di sicurezza applicate a tutte le pagine. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * Content Security Policy. Gli script inline restano ammessi (idratazione di Next.js senza nonce,
 * necessaria per le pagine prerenderizzate): la policy limita comunque le origini esterne, i frame,
 * i plugin e le destinazioni dei moduli. Le origini di GA4/pixel si aggiungono solo se configurati.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV === "development";
  const sb = supabaseHost ? `https://${supabaseHost}` : "";
  const sbWs = supabaseHost ? `wss://${supabaseHost}` : "";
  const gtag = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const script = ["'self'", "'unsafe-inline'", dev && "'unsafe-eval'", gtag && "https://www.googletagmanager.com", meta && "https://connect.facebook.net", tiktok && "https://analytics.tiktok.com"];
  const connect = ["'self'", sb, sbWs, gtag && "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.g.doubleclick.net", meta && "https://*.facebook.com", tiktok && "https://*.tiktok.com", dev && "ws:"];
  const img = ["'self'", "data:", "blob:", sb, "https://tile.openstreetmap.org", gtag && "https://*.google-analytics.com https://www.googletagmanager.com https://*.g.doubleclick.net https://www.google.com", meta && "https://www.facebook.com", tiktok && "https://*.tiktok.com"];
  const frame = gtag && process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ? ["https://td.doubleclick.net", "https://www.googletagmanager.com"] : ["'none'"];
  const j = (a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");
  return [
    "default-src 'self'", `script-src ${j(script)}`, "style-src 'self' 'unsafe-inline'", `img-src ${j(img)}`, "font-src 'self' data:",
    `connect-src ${j(connect)}`, `media-src 'self' blob: ${sb}`.trim(), `frame-src ${frame.join(" ")}`, "frame-ancestors 'none'",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "manifest-src 'self'", "worker-src 'self' blob:", ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
securityHeaders.push({ key: "Content-Security-Policy", value: contentSecurityPolicy() });
securityHeaders.push({ key: "Cross-Origin-Opener-Policy", value: "same-origin" });

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async redirects() {
    // Compatibilità con l'esempio del brief (/auto?marca=bmw): i parametri vengono mantenuti.
    return [{ source: "/auto", destination: "/auto-usate", permanent: true }];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/dashboard/:path*", "/admin/:path*", "/business/:path*", "/auth/:path*", "/disiscriviti/:path*", "/aggiorna-password"].map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;

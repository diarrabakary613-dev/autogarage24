import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics/tracker";
import { ConsentManager } from "@/components/consent/consent-manager";
import { anyThirdParty, thirdPartyIds } from "@/lib/consent";
import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "AutoGarage24 — Tutto il mondo dell'automobile. In un unico posto.",
    template: "%s | AutoGarage24",
  },
  description:
    "Trova la tua prossima automobile, scopri officine e meccanici qualificati, cerca ricambi e gestisci le esigenze della tua auto con AutoGarage24.",
  applicationName: "AutoGarage24",
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "AutoGarage24",
  },
  formatDetection: { telephone: false },
  twitter: { card: "summary_large_image" },
  // Verifica di Google Search Console / Bing tramite meta tag (valore fornito dalla console, non segreto).
  verification: {
    ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : {}),
    ...(process.env.NEXT_PUBLIC_BING_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#111318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full scroll-smooth">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="contenuto" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
        <Suspense fallback={null}><AnalyticsTracker /></Suspense>
        {anyThirdParty() && <ConsentManager ids={thirdPartyIds()} />}
      </body>
    </html>
  );
}

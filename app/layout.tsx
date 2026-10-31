import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/manrope/latin.css";
import "@fontsource/jetbrains-mono/latin.css";
import "./globals.css";
import { siteUrl, isIndexable } from "@/config/site";
import { SiteStructuredData } from "@/components/cummon/structured-data";
import { creator } from "@/config/creator";
import { brand } from "@/config/brand";
import { homeTitle, homeDescription } from "@/lib/seo/metadata";
import { AppShell } from "@/components/layout/app-shell";
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  robots: { index: isIndexable, follow: true },
  title: {
    default: `${homeTitle} · ${brand.name}`,
    template: `%s · ${brand.name}`,
  },
  description: homeDescription,
  applicationName: brand.name,
  creator: creator.fullName,
  authors: [{ name: creator.fullName }],
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.dataset.theme=localStorage.getItem('al1-theme')==='dark'?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SiteStructuredData />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "@fontsource/manrope/latin.css";
import "@fontsource/jetbrains-mono/latin.css";
import "./globals.css";
import { siteUrl, isIndexable } from "@/lib/site-url";
import { SiteStructuredData } from "@/components/seo-structured-data";
import { creator } from "@/lib/creator";
import { homeTitle, homeDescription } from "@/lib/seo";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  robots: { index: isIndexable, follow: true },
  title: {
    default: homeTitle,
    template: "%s · Al1 Tools",
  },
  description: homeDescription,
  applicationName: "Al1 Developer Tools",
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
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

import type { Metadata } from "next";
import "@fontsource/manrope/latin.css";
import "@fontsource/jetbrains-mono/latin.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
  title: {
    default: "Al1 Developer Tools — A little less busywork.",
    template: "%s · Al1 Tools",
  },
  description: "Thoughtful, free utilities for your everyday development workflow.",
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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

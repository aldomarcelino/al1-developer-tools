import type { Metadata } from "next";
import { NotFoundPage } from "@/features/not-found/components/not-found-page";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundPage />;
}

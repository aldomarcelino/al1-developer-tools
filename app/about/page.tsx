import { AboutPage } from "@/features/about/components/about-page";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata(
  "About Ramupod",
  "Ramupod is an independent collection of free online tools for documents, text, data, and everyday tasks, created and maintained by Aldo Marcelino NF Lubis.",
  "/about"
);
export default function Page() {
  return <AboutPage />;
}

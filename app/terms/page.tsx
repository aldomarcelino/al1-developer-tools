import { LegalPage } from "@/components/legal-page";
import { termsOfUse } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  termsOfUse.title,
  termsOfUse.description,
  termsOfUse.path
);
export default function TermsPage() {
  return <LegalPage document={termsOfUse} />;
}

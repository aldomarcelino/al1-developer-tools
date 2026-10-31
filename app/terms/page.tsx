import { LegalPage } from "@/features/legal/components/legal-page";
import { termsOfUse } from "@/features/legal/data/policies";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  termsOfUse.title,
  termsOfUse.description,
  termsOfUse.path
);
export default function TermsPage() {
  return <LegalPage document={termsOfUse} />;
}

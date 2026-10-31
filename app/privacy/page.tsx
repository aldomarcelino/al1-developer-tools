import { LegalPage } from "@/features/legal/components/legal-page";
import { privacyPolicy } from "@/features/legal/data/policies";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  privacyPolicy.title,
  privacyPolicy.description,
  privacyPolicy.path
);
export default function PrivacyPage() {
  return <LegalPage document={privacyPolicy} />;
}

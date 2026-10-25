import { LegalPage } from "@/components/legal-page";
import { privacyPolicy } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  privacyPolicy.title,
  privacyPolicy.description,
  privacyPolicy.path
);
export default function PrivacyPage() {
  return <LegalPage document={privacyPolicy} />;
}

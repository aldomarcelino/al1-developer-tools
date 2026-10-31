import { HomePage } from "@/features/home/components/home-page";
import { homeTitle, homeDescription, pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(homeTitle, homeDescription, "/");
export default function Page() {
  return <HomePage />;
}

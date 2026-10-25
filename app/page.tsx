import { Home } from "@/components/home";
import { homeTitle, homeDescription, pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(homeTitle, homeDescription, "/");
export default function Page() {
  return <Home />;
}

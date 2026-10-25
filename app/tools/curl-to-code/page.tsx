import { CurlWorkspace } from "@/components/curl-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

export const metadata = toolMetadata("curl-to-code");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="curl-to-code" />
      <CurlWorkspace />
      <ToolContext slug="curl-to-code" />
    </>
  );
}

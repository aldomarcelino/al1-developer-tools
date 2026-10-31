import { CurlWorkspace } from "@/features/curl-to-code/components/curl-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

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

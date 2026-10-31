import { IpWorkspace } from "@/features/ip-inspector/components/ip-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("ip-inspector");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="ip-inspector" />
      <IpWorkspace />
      <ToolContext slug="ip-inspector" />
    </>
  );
}

import { Base64Workspace } from "@/components/base64-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

export const metadata = toolMetadata("base64-url");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="base64-url" />
      <Base64Workspace />
      <ToolContext slug="base64-url" />
    </>
  );
}

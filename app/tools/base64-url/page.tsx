import { Base64Workspace } from "@/features/base64-url/components/base64-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

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

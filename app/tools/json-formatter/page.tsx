import { JsonWorkspace } from "@/components/json-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

export const metadata = toolMetadata("json-formatter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="json-formatter" />
      <JsonWorkspace />
      <ToolContext slug="json-formatter" />
    </>
  );
}

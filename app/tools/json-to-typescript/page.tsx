import { JsonToTsWorkspace } from "@/components/json-to-ts-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

export const metadata = toolMetadata("json-to-typescript");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="json-to-typescript" />
      <JsonToTsWorkspace />
      <ToolContext slug="json-to-typescript" />
    </>
  );
}

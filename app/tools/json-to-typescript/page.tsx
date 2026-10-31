import { JsonToTsWorkspace } from "@/features/json-to-typescript/components/json-to-ts-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

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

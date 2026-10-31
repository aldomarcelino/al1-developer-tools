import { YamlWorkspace } from "@/features/json-yaml-converter/components/yaml-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("json-yaml-converter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="json-yaml-converter" />
      <YamlWorkspace />
      <ToolContext slug="json-yaml-converter" />
    </>
  );
}

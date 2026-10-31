import { UnitWorkspace } from "@/features/unit-converter/components/unit-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("unit-converter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="unit-converter" />
      <UnitWorkspace />
      <ToolContext slug="unit-converter" />
    </>
  );
}

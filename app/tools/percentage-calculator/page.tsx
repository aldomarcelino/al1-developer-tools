import { PercentageWorkspace } from "@/features/percentage-calculator/components/percentage-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("percentage-calculator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="percentage-calculator" />
      <PercentageWorkspace />
      <ToolContext slug="percentage-calculator" />
    </>
  );
}

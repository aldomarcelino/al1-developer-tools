import { ScientificCalculatorWorkspace } from "@/features/scientific-calculator/components/scientific-calculator-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("scientific-calculator");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="scientific-calculator" />
      <ScientificCalculatorWorkspace />
      <ToolContext slug="scientific-calculator" />
    </>
  );
}

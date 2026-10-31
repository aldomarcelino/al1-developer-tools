import { SvgWorkspace } from "@/features/svg-optimizer/components/svg-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("svg-optimizer");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="svg-optimizer" />
      <SvgWorkspace />
      <ToolContext slug="svg-optimizer" />
    </>
  );
}

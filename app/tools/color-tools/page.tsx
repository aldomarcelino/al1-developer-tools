import { ColorWorkspace } from "@/features/color-tools/components/color-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("color-tools");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="color-tools" />
      <ColorWorkspace />
      <ToolContext slug="color-tools" />
    </>
  );
}

import { ResizerWorkspace } from "@/features/image-resizer/components/resizer-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("image-resizer");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="image-resizer" />
      <ResizerWorkspace />
      <ToolContext slug="image-resizer" />
    </>
  );
}

import { DiffWorkspace } from "@/features/diff-viewer/components/diff-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("diff-viewer");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="diff-viewer" />
      <DiffWorkspace />
      <ToolContext slug="diff-viewer" />
    </>
  );
}

import { DiffWorkspace } from "@/components/diff-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

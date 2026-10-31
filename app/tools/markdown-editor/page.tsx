import { MarkdownWorkspace } from "@/features/markdown-editor/components/markdown-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("markdown-editor");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="markdown-editor" />
      <MarkdownWorkspace />
      <ToolContext slug="markdown-editor" />
    </>
  );
}

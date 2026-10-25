import { MarkdownWorkspace } from "@/components/markdown-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

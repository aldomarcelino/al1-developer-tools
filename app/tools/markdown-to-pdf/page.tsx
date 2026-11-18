import { MarkdownToPdfWorkspace } from "@/features/markdown-to-pdf/components/markdown-to-pdf-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("markdown-to-pdf");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="markdown-to-pdf" />
      <MarkdownToPdfWorkspace />
      <ToolContext slug="markdown-to-pdf" />
    </>
  );
}

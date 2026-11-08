import { PdfToMarkdownWorkspace } from "@/features/pdf-to-markdown/components/pdf-to-markdown-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

const slug = "pdf-to-markdown";
export const metadata = toolMetadata(slug);

export default function Page() {
  return (
    <>
      <ToolStructuredData slug={slug} />
      <PdfToMarkdownWorkspace />
      <ToolContext slug={slug} />
    </>
  );
}

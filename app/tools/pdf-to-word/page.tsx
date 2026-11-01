import { PdfToWordWorkspace } from "@/features/pdf-to-word/components/pdf-to-word-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("pdf-to-word");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="pdf-to-word" />
      <PdfToWordWorkspace />
      <ToolContext slug="pdf-to-word" />
    </>
  );
}

import { PdfEditorWorkspace } from "@/features/pdf-editor/components/pdf-editor-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("pdf-editor");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="pdf-editor" />
      <PdfEditorWorkspace />
      <ToolContext slug="pdf-editor" />
    </>
  );
}

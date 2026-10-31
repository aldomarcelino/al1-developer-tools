import { PdfWorkspace } from "@/features/pdf-merge-split/components/pdf-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("pdf-merge-split");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="pdf-merge-split" />
      <PdfWorkspace />
      <ToolContext slug="pdf-merge-split" />
    </>
  );
}

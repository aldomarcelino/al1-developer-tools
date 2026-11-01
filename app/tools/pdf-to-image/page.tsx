import { PdfToImageWorkspace } from "@/features/pdf-to-image/components/pdf-to-image-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("pdf-to-image");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="pdf-to-image" />
      <PdfToImageWorkspace />
      <ToolContext slug="pdf-to-image" />
    </>
  );
}

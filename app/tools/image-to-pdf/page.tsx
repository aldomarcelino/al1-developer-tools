import { ImagePdfWorkspace } from "@/features/image-to-pdf/components/image-pdf-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("image-to-pdf");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="image-to-pdf" />
      <ImagePdfWorkspace />
      <ToolContext slug="image-to-pdf" />
    </>
  );
}

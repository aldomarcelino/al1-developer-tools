import { FileArchive } from "lucide-react";
import { ToolContext } from "@/components/cummon/tool-context";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { PdfCompressorWorkspace } from "@/features/pdf-compressor/pdf-compressor-workspace";
import { toolMetadata } from "@/lib/seo/metadata";

const slug = "pdf-compressor";
export const metadata = toolMetadata(slug);

export default function Page() {
  return (
    <>
      <ToolStructuredData slug={slug} />
      <div className="workspace-page page-width">
        <ToolHeader title="PDF Compressor" icon={<FileArchive size={24} />} />
        <PdfCompressorWorkspace />
      </div>
      <ToolContext slug={slug} />
    </>
  );
}

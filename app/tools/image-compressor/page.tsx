import { ImageCompressorWorkspace } from "@/features/image-compressor/components/image-compressor-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("image-compressor");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="image-compressor" />
      <ImageCompressorWorkspace />
      <ToolContext slug="image-compressor" />
    </>
  );
}

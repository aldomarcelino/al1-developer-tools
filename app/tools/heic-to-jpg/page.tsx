import { HeicWorkspace } from "@/features/heic-converter/components/heic-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("heic-to-jpg");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="heic-to-jpg" />
      <HeicWorkspace />
      <ToolContext slug="heic-to-jpg" />
    </>
  );
}

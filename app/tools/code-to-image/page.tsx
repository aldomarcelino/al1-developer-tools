import { CodeToImageWorkspace } from "@/features/code-to-image/components/code-to-image-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("code-to-image");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="code-to-image" />
      <CodeToImageWorkspace />
      <ToolContext slug="code-to-image" />
    </>
  );
}

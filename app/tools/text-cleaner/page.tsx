import { TextCleanerWorkspace } from "@/features/text-cleaner/components/text-cleaner-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("text-cleaner");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="text-cleaner" />
      <TextCleanerWorkspace />
      <ToolContext slug="text-cleaner" />
    </>
  );
}

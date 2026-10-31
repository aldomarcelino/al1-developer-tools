import { KeygenWorkspace } from "@/features/uuid-generator/components/keygen-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("uuid-generator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="uuid-generator" />
      <KeygenWorkspace />
      <ToolContext slug="uuid-generator" />
    </>
  );
}

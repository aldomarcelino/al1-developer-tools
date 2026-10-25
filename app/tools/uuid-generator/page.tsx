import { KeygenWorkspace } from "@/components/keygen-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

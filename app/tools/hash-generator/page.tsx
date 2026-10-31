import { HashWorkspace } from "@/features/hash-generator/components/hash-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("hash-generator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="hash-generator" />
      <HashWorkspace />
      <ToolContext slug="hash-generator" />
    </>
  );
}

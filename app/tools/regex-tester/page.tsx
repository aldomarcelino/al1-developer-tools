import { RegexWorkspace } from "@/components/regex-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

export const metadata = toolMetadata("regex-tester");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="regex-tester" />
      <RegexWorkspace />
      <ToolContext slug="regex-tester" />
    </>
  );
}

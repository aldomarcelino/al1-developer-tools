import { RegexWorkspace } from "@/features/regex-tester/components/regex-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

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

import { QaWorkspace } from "@/features/qa-bug-report/components/qa-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("qa-bug-report");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="qa-bug-report" />
      <QaWorkspace />
      <ToolContext slug="qa-bug-report" />
    </>
  );
}

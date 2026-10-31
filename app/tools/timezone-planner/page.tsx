import { TimezoneWorkspace } from "@/features/timezone-planner/components/timezone-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("timezone-planner");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="timezone-planner" />
      <TimezoneWorkspace />
      <ToolContext slug="timezone-planner" />
    </>
  );
}

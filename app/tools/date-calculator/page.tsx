import { DateWorkspace } from "@/features/date-calculator/components/date-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("date-calculator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="date-calculator" />
      <DateWorkspace />
      <ToolContext slug="date-calculator" />
    </>
  );
}

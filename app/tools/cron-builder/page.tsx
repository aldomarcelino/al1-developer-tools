import { CronWorkspace } from "@/features/cron-builder/components/cron-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("cron-builder");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="cron-builder" />
      <CronWorkspace />
      <ToolContext slug="cron-builder" />
    </>
  );
}

import { SqlWorkspace } from "@/features/sql-formatter/components/sql-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("sql-formatter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="sql-formatter" />
      <SqlWorkspace />
      <ToolContext slug="sql-formatter" />
    </>
  );
}

import { SqlWorkspace } from "@/components/sql-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

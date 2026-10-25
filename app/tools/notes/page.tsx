import { NotesWorkspace } from "@/components/notes-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";
export const metadata = toolMetadata("notes");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="notes" />
      <NotesWorkspace />
      <ToolContext slug="notes" />
    </>
  );
}

import { NotesWorkspace } from "@/features/notes/components/notes-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
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

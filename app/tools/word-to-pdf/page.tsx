import { WordToPdfWorkspace } from "@/features/word-to-pdf/components/word-to-pdf-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("word-to-pdf");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="word-to-pdf" />
      <WordToPdfWorkspace />
      <ToolContext slug="word-to-pdf" />
    </>
  );
}

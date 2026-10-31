import { CharacterCounterWorkspace } from "@/features/character-counter/components/character-counter-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("character-counter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="character-counter" />
      <CharacterCounterWorkspace />
      <ToolContext slug="character-counter" />
    </>
  );
}

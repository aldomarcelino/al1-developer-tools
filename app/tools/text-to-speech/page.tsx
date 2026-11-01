import { VoiceStudioCore } from "@/features/voice-studio/components/voice-studio-core";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("text-to-speech");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="text-to-speech" />
      <VoiceStudioCore defaultMode="tts" />
      <ToolContext slug="text-to-speech" />
    </>
  );
}

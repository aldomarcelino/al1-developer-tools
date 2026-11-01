import { VoiceStudioCore } from "@/features/voice-studio/components/voice-studio-core";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("speech-to-text");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="speech-to-text" />
      <VoiceStudioCore defaultMode="stt" />
      <ToolContext slug="speech-to-text" />
    </>
  );
}

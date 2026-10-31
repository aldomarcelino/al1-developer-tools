import { TimestampWorkspace } from "@/features/timestamp-converter/components/timestamp-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("timestamp-converter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="timestamp-converter" />
      <TimestampWorkspace />
      <ToolContext slug="timestamp-converter" />
    </>
  );
}

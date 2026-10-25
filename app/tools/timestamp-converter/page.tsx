import { TimestampWorkspace } from "@/components/timestamp-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

import { ScreenRecorderWorkspace } from "@/features/screen-recorder/components/screen-recorder-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("screen-recorder");

export default function Page() {
  return (
    <>
      <ToolStructuredData slug="screen-recorder" />
      <ScreenRecorderWorkspace />
      <ToolContext slug="screen-recorder" />
    </>
  );
}

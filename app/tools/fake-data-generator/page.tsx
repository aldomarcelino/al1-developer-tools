import { FakeDataWorkspace } from "@/features/fake-data/components/fake-data-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("fake-data-generator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="fake-data-generator" />
      <FakeDataWorkspace />
      <ToolContext slug="fake-data-generator" />
    </>
  );
}

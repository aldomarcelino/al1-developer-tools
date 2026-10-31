import { JwtWorkspace } from "@/features/jwt-decoder/components/jwt-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("jwt-decoder");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="jwt-decoder" />
      <JwtWorkspace />
      <ToolContext slug="jwt-decoder" />
    </>
  );
}

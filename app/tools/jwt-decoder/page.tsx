import { JwtWorkspace } from "@/components/jwt-workspace";
import { toolMetadata } from "@/lib/seo";
import { ToolStructuredData } from "@/components/seo-structured-data";
import { ToolContext } from "@/components/tool-context";

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

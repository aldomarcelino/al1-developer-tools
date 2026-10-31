import { QrCodeWorkspace } from "@/features/qr-code-generator/components/qr-code-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";

export const metadata = toolMetadata("qr-code-generator");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="qr-code-generator" />
      <QrCodeWorkspace />
      <ToolContext slug="qr-code-generator" />
    </>
  );
}

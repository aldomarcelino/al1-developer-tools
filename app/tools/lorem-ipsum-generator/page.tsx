import { AlignLeft } from "lucide-react";
import { ToolContext } from "@/components/cummon/tool-context";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { LoremIpsumWorkspace } from "@/features/lorem-ipsum-generator/lorem-ipsum-workspace";
import { toolMetadata } from "@/lib/seo/metadata";

const slug = "lorem-ipsum-generator";
export const metadata = toolMetadata(slug);

export default function Page() {
  return (
    <>
      <ToolStructuredData slug={slug} />
      <div className="workspace-page page-width">
        <ToolHeader title="Lorem Ipsum Generator" icon={<AlignLeft size={24} />} />
        <LoremIpsumWorkspace />
      </div>
      <ToolContext slug={slug} />
    </>
  );
}

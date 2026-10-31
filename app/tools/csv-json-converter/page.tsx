import { CsvJsonWorkspace } from "@/features/csv-json-converter/components/csv-json-workspace";
import { toolMetadata } from "@/lib/seo/metadata";
import { ToolStructuredData } from "@/components/cummon/structured-data";
import { ToolContext } from "@/components/cummon/tool-context";
export const metadata = toolMetadata("csv-json-converter");
export default function Page() {
  return (
    <>
      <ToolStructuredData slug="csv-json-converter" />
      <CsvJsonWorkspace />
      <ToolContext slug="csv-json-converter" />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { tools } from "@/lib/tools";
import { ToolIcon } from "@/components/icon";
const implementedSlugs = new Set([
  "json-formatter",
  "markdown-editor",
  "diff-viewer",
  "jwt-decoder",
  "base64-url",
  "base64",
  "regex-tester",
  "timestamp-converter",
  "uuid-generator",
  "random-keygen",
  "json-to-typescript",
]);

export function generateStaticParams() {
  return tools
    .filter((t) => !implementedSlugs.has(t.slug))
    .map((t) => ({ slug: t.slug }));
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (implementedSlugs.has(slug)) notFound();
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) notFound();
  return (
    <div className="page-width coming-page">
      <div className="breadcrumbs">
        <Link href="/">All tools</Link>
        <ChevronRight size={13} />
        <span>{tool.name}</span>
      </div>
      <section className="coming-panel">
        <span className="tool-icon">
          <ToolIcon name={tool.icon} size={30} />
        </span>
        <h1>{tool.name}</h1>
        <span className="coming-label">Coming soon</span>
        <div className="coming-explanation">
          {tool.phase === 3
            ? "This tool will use a backend to receive and store webhook requests. Endpoint management, request history, and controlled replay are planned for Phase 3. No requests are being captured yet."
            : "This utility is planned for Phase 2. We’re refining the core workspace first, starting with a fully functional JSON Formatter."}
        </div>
        <Link className="button primary" href="/tools/json-formatter">
          Try JSON Formatter <ArrowUpRight size={16} />
        </Link>
        <Link className="text-button" href="/">
          <ArrowLeft size={15} />
          Back to all tools
        </Link>
      </section>
    </div>
  );
}

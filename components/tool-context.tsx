import Link from "next/link";
import { availableTool, toolSeo, type ToolSlug } from "@/lib/seo";
import { tools } from "@/lib/tools";

export function ToolContext({ slug }: { slug: ToolSlug }) {
  const tool = availableTool(slug);
  if (!tool) return null;
  const related = tools
    .filter((entry) => entry.status === "available" && entry.slug !== slug)
    .sort(
      (a, b) =>
        Number(b.category === tool.category) - Number(a.category === tool.category)
    )
    .slice(0, 3);
  return (
    <section className="tool-context page-width" aria-label={`Using ${tool.name}`}>
      <div>
        <h2>Using {tool.name}</h2>
        <p>{toolSeo[slug].note}</p>
      </div>
      <nav aria-label="Related developer tools">
        <h3>Keep your workflow moving</h3>
        <div>
          {related.map((entry) => (
            <Link key={entry.slug} href={`/tools/${entry.slug}`}>
              {entry.name}
              <span aria-hidden="true"> ↗</span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}

import styles from "./tool-context.module.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { availableTool } from "@/lib/seo/metadata";
import { toolSeo, type ToolSlug } from "@/lib/seo/tool-metadata";
import { tools } from "@/config/tools";

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
    <section
      className={`tool-context page-width ${styles.scope}`}
      aria-label={`Using ${tool.name}`}
    >
      <div>
        <h2>Using {tool.name}</h2>
        <p>{toolSeo[slug].note}</p>
      </div>
      <nav aria-label="Related tools">
        <h3>Keep your workflow moving</h3>
        <div>
          {related.map((entry) => (
            <Link key={entry.slug} href={`/tools/${entry.slug}`}>
              <span>{entry.name}</span>
              <span className="related-tool-arrow" aria-hidden="true">
                <ArrowRight size={14} strokeWidth={1.7} />
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}

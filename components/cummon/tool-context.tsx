import styles from "./tool-context.module.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { availableTool } from "@/lib/seo/metadata";
import { toolSeo, type ToolSlug } from "@/lib/seo/tool-metadata";
import { toolGuides, type ToolGuide } from "@/lib/seo/tool-guides";
import { tools } from "@/config/tools";

export function ToolContext({ slug }: { slug: ToolSlug }) {
  const tool = availableTool(slug);
  const guide: ToolGuide = toolGuides[slug];
  const seo = toolSeo[slug];
  if (!tool || !guide || !seo) return null;
  const related = guide.related
    ? guide.related.flatMap((relatedSlug) => {
        const entry = availableTool(relatedSlug);
        return entry ? [entry] : [];
      })
    : tools
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
      <div className={styles.guide}>
        <h2>How to use {tool.name}</h2>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3>Try an example</h3>
        <pre className={styles.example}>{guide.example}</pre>
        <p>{guide.result}</p>
      </div>
      <div className={styles.details}>
        <div>
          <h2>What to know before using {tool.name}</h2>
          <p>{seo.note}</p>
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
      </div>
    </section>
  );
}

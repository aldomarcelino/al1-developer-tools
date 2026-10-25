import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CornerDownRight, Search, Terminal } from "lucide-react";
import { ToolIcon } from "@/components/icon";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const suggestions = ["json-formatter", "json-to-typescript", "timestamp-converter"];

export default function NotFound() {
  const suggestedTools = suggestions.flatMap((slug) => {
    const tool = tools.find(
      (entry) => entry.slug === slug && entry.status === "available"
    );
    return tool ? [tool] : [];
  });

  return (
    <div className="not-found-page page-width">
      <section className="not-found-main" aria-labelledby="not-found-title">
        <div className="not-found-copy">
          <span className="not-found-label">
            <span />
            404 · PAGE NOT FOUND
          </span>
          <h1 id="not-found-title">
            A small detour.
            <br />
            <span>Let’s get you back.</span>
          </h1>
          <p>
            This page may have moved, or the link took a wrong turn. Your next useful tool
            is just a click away.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="button primary">
              <ArrowLeft size={16} />
              Back to home
            </Link>
            <Link href="/#tools" className="button">
              <Search size={16} />
              Browse tools
            </Link>
          </div>
        </div>
        <div className="not-found-terminal" aria-hidden="true">
          <div className="not-found-terminal-bar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <span>
              <Terminal size={13} />
              route.resolve()
            </span>
            <span>AL1</span>
          </div>
          <div className="not-found-terminal-body">
            <span className="not-found-comment">
              {"// not every path leads somewhere"}
            </span>
            <span className="not-found-number">
              404<span>_</span>
            </span>
            <span className="not-found-terminal-message">
              <CornerDownRight size={16} />
              No matching route found.
            </span>
          </div>
          <div className="not-found-terminal-footer">
            <span className="not-found-terminal-dot" />
            The toolkit is still right here.
            <ArrowRight size={15} />
          </div>
        </div>
      </section>
      <nav className="not-found-suggestions" aria-label="Suggested developer tools">
        <div className="not-found-suggestions-heading">
          <h2>A few good places to start</h2>
          <span>Less searching. More building.</span>
        </div>
        <div className="not-found-tools">
          {suggestedTools.map((tool) => (
            <Link href={`/tools/${tool.slug}`} key={tool.slug}>
              <span className="not-found-tool-icon">
                <ToolIcon name={tool.icon} size={21} />
              </span>
              <span>
                {tool.name}
                <small>{tool.category}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

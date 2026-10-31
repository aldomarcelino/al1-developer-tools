import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { isPopularTool, type Tool } from "@/config/tools";
import { ToolIcon } from "@/components/cummon/tool-icon";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`tool-card ${tool.status === "available" ? "available" : ""}`}
    >
      <div className="card-top">
        <span className={`tool-icon icon-${tool.icon}`}>
          <ToolIcon name={tool.icon} size={23} />
        </span>
        {isPopularTool(tool.slug) ? (
          <span className="popular">
            <span />
            Popular
          </span>
        ) : (
          <ArrowUpRight className="card-arrow" size={17} />
        )}
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
      <div className="card-bottom">
        <span>{tool.category}</span>
        {tool.status === "available" ? (
          <span className="ready">
            Open tool <ArrowRight size={13} />
          </span>
        ) : (
          <span className="coming-soon">Coming soon</span>
        )}
      </div>
    </Link>
  );
}

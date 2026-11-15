"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Command, Search, X } from "lucide-react";
import { categories, tools, searchTools } from "@/config/tools";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ToolIcon } from "@/components/cummon/tool-icon";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolCard } from "./tool-card";

const availableTools = tools.filter((tool) => tool.status === "available");
const categoryOptions = categories.map((category) => ({
  value: category,
  label: `${category} (${category === "All tools" ? availableTools.length : availableTools.filter((tool) => tool.category === category).length})`,
}));

export function ToolDiscovery() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [category, setCategory] = useState("All tools");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const filtered = useMemo(
    () => searchTools(tools, debouncedQuery, category),
    [category, debouncedQuery]
  );
  const activeToolCount = availableTools.length;
  const visibleTools = filtered.filter((tool) => tool.status === "available");
  return (
    <section id="tools" className="tool-discovery">
      <div className="page-width">
        <div className="section-top">
          <div>
            <h2>Good tools. Clear head.</h2>
            <p>Write, format, compare, and simplify the little things.</p>
          </div>
          <span className="tool-total">{activeToolCount} purpose-built tools</span>
        </div>
        <div className="discovery-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              ref={input}
              type="text"
              aria-label="Search tools"
              placeholder="Find your next go-to tool…"
              value={query}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value.slice(0, 64))}
            />
            {query ? (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            ) : (
              <kbd>
                <Command size={11} /> K
              </kbd>
            )}
          </div>
          <span className="search-hint">A shortcut to your next task.</span>
        </div>
        <div className="mobile-category-filter">
          <CustomSelect
            className="mobile-category-field"
            label="Category"
            layout="stacked"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
          <span className="filter-result-count" role="status">
            {visibleTools.length} {visibleTools.length === 1 ? "tool" : "tools"}
          </span>
        </div>
        <div className="categories" role="group" aria-label="Tool categories">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
            >
              {c}
              {c === "All tools" && <span>{activeToolCount}</span>}
            </button>
          ))}
        </div>
        <div className="tool-grid-wrapper">
          <div className="tool-grid">
            {visibleTools.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
          {filtered.some((t) => t.slug === "webhook-inspector") && (
            <Link href="/tools/webhook-inspector" className="webhook-feature">
              <div className="feature-icon">
                <ToolIcon name="webhook" size={29} />
              </div>
              <div>
                <div className="feature-heading">
                  <h3>Meet your next debugging companion.</h3>
                  <span>IN THE WORKS</span>
                </div>
                <p>
                  Webhook Inspector. A preview of request capture, inspection, and replay.
                  Not available yet.
                </p>
                <span className="feature-link">
                  Take a look at what’s next <ArrowUpRight size={14} />
                </span>
              </div>
              <div className="request-preview" aria-hidden="true">
                <span>
                  <i />
                  POST <b>/your-endpoint</b>
                  <em>200 OK</em>
                </span>
                <span>
                  <i />
                  POST <b>/your-endpoint</b>
                  <em>200 OK</em>
                </span>
                <span>
                  <i />
                  GET <b>/your-endpoint</b>
                  <em>200 OK</em>
                </span>
              </div>
            </Link>
          )}
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No tools found</h3>
              <p>Try another search or choose a different category.</p>
              <button
                className="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All tools");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <p className="phase-note">
          {activeToolCount} tools are ready to use. Webhook Inspector is in the works.
        </p>
      </div>
    </section>
  );
}

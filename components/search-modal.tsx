"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Search, Sparkles, X } from "lucide-react";
import { tools } from "@/lib/tools";
import { ToolIcon } from "@/components/icon";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  "All",
  "Data",
  "Database",
  "Text",
  "Security",
  "Encoding",
  "Utilities",
  "Network",
] as const;

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter tools based on query and selected category
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === "All" || tool.category === selectedCategory;
      const matchesQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        ("tag" in tool &&
          typeof tool.tag === "string" &&
          tool.tag.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  // Reset index when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Manage focus and body scroll lock
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    setQuery("");
    setSelectedCategory("All");
    setSelectedIndex(0);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeItem = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`
    );
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard navigation within the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (filteredTools.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredTools.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredTools.length) % filteredTools.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredTools[selectedIndex];
      if (target) {
        onClose();
        router.push(`/tools/${target.slug}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search tools"
    >
      <div className="search-modal-container" onKeyDown={handleKeyDown}>
        {/* Search Input Bar */}
        <div className="search-modal-header">
          <Search size={18} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 64))}
            placeholder="Search tools, formats, utilities… (e.g. JWT, JSON, Regex)"
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search tools"
          />
          <div className="search-modal-action-slot">
            {query ? (
              <button
                type="button"
                className="search-modal-clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : (
              <kbd
                className="search-modal-esc"
                onClick={onClose}
                title="Press ESC to close"
              >
                ESC
              </kbd>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="search-modal-categories" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`search-cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="search-modal-results" ref={listRef}>
          {filteredTools.length > 0 ? (
            filteredTools.map((tool, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className={`search-result-item ${isSelected ? "selected" : ""}`}
                  data-index={idx}
                  onClick={onClose}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="search-result-icon">
                    <ToolIcon name={tool.icon} size={18} />
                  </div>
                  <div className="search-result-body">
                    <div className="search-result-title-row">
                      <span className="search-result-name">{tool.name}</span>
                      {"tag" in tool && tool.tag && (
                        <span className="search-result-tag">
                          <Sparkles size={11} /> {tool.tag}
                        </span>
                      )}
                      <span className="search-result-cat">{tool.category}</span>
                    </div>
                    <p className="search-result-desc">{tool.description}</p>
                  </div>
                  <div className="search-result-action">
                    {isSelected ? (
                      <span className="search-result-enter-hint">
                        <CornerDownLeft size={13} />
                      </span>
                    ) : (
                      <ArrowRight size={14} className="search-result-arrow" />
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="search-empty-state">
              <Search size={32} className="search-empty-icon" />
              <p className="search-empty-title">
                No tools found matching &ldquo;{query}&rdquo;
              </p>
              <p className="search-empty-hint">
                Try searching for &ldquo;jwt&rdquo;, &ldquo;json&rdquo;,
                &ldquo;diff&rdquo;, &ldquo;regex&rdquo;, or &ldquo;timestamp&rdquo;.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts */}
        <div className="search-modal-footer">
          <div className="search-footer-shortcuts">
            <span className="search-shortcut-item">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>navigate</span>
            </span>
            <span className="search-shortcut-item">
              <kbd>↵</kbd>
              <span>select</span>
            </span>
            <span className="search-shortcut-item">
              <kbd>esc</kbd>
              <span>close</span>
            </span>
          </div>
          <span className="search-footer-meta">
            {tools.filter((tool) => tool.status === "available").length} tools •
            Browser-local
          </span>
        </div>
      </div>
    </div>
  );
}

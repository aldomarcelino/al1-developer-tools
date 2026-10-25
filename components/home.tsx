"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Command,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { categories, tools } from "@/lib/tools";
import { ToolIcon } from "./icon";
export function Home() {
  const [query, setQuery] = useState("");
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
  const filtered = tools.filter(
    (t) =>
      (category === "All tools" || t.category === category) &&
      `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase())
  );
  const activeToolCount = tools.filter((t) => t.status === "available").length;
  return (
    <div className="home">
      <section className="hero page-width">
        <h1>
          The tools you need.
          <br />
          <span>The space to build.</span>
        </h1>
        <p>
          Your everyday developer essentials, in one thoughtful workspace.
          <br className="desktop-break" /> Less busywork. No sign-ups. More time for what
          matters.
        </p>
        <div className="hero-actions">
          <Link href="/tools/json-formatter" className="button primary">
            Get started <ArrowUpRight size={17} />
          </Link>
          <a href="#tools" className="button secondary">
            Explore tools <ArrowDown size={16} />
          </a>
        </div>
        <div className="hero-bottom">
          <span>
            <ShieldCheck size={16} /> Private by design
          </span>
          <i />
          <span>
            <Check size={16} /> Free. No account needed.
          </span>
        </div>
        <div className="hero-showcase">
          <Link href="/tools/json-formatter" className="showcase-azure">
            <span className="showcase-top">
              <ToolIcon name="json" size={29} />
              <ArrowUpRight size={20} />
            </span>
            <span className="showcase-code" aria-hidden="true">
              {"{"}
              <br />
              &nbsp; "less": "busywork",
              <br />
              &nbsp; "more": "building"
              <br />
              {"}"}
            </span>
            <span className="showcase-title">
              A little order.
              <br />A lot of clarity.
            </span>
            <span className="showcase-caption">JSON Formatter & Validator</span>
          </Link>
          <div className="showcase-lime">
            <ShieldCheck size={29} />
            <div>
              <span className="showcase-number">100%</span>
              <h2>Yours. Always.</h2>
              <p>
                Your JSON stays in your browser.
                <br />
                Right where it belongs.
              </p>
            </div>
          </div>
          <Link
            href="/tools/markdown-editor"
            className="showcase-editor showcase-markdown"
            aria-label="Open Markdown Editor and live preview"
          >
            <div className="mini-editor-bar">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>hello.md</span>
              <ArrowUpRight size={17} />
            </div>
            <pre aria-hidden="true">
              <span className="mini-line">01</span>{" "}
              <span className="mini-key"># Hello, developer.</span>
              <br />
              <span className="mini-line">02</span>
              <br />
              <span className="mini-line">03</span> A little{" "}
              <span className="mini-string">**clarity**</span>.<br />
              <span className="mini-line">04</span> More room to build.
              <br />
              <span className="mini-line">05</span>
              <br />
              <span className="mini-line">06</span>{" "}
              <span className="mini-string">- [x]</span> Make something useful.
              <span className="mini-cursor" />
            </pre>
            <div className="mini-editor-status">
              <span>
                <Check size={13} /> Live Markdown preview
              </span>
              <span>Write. Preview. Create.</span>
            </div>
          </Link>
          <a href="#tools" className="showcase-count">
            <span className="count-spark">✳</span>
            <div>
              <span className="showcase-number">{activeToolCount}</span>
              <h2>
                Small tools.
                <br />
                Big difference.
              </h2>
              <p>One focused toolkit.</p>
            </div>
            <ArrowDown size={19} />
          </a>
        </div>
      </section>
      <section id="tools" className="tool-discovery">
        <div className="page-width">
          <div className="section-top">
            <div>
              <h2>Good tools. Clear head.</h2>
              <p>Small utilities for the things between the big things.</p>
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
          <div className="categories" aria-label="Tool categories">
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
          <div key={`${category}-${query}`} className="tool-grid-wrapper">
            <div className="tool-grid">
              {filtered
                .filter((t) => t.status === "available")
                .map((t) => (
                  <Link
                    href={`/tools/${t.slug}`}
                    key={t.slug}
                    className={`tool-card ${t.status === "available" ? "available" : ""}`}
                  >
                    <div className="card-top">
                      <span className={`tool-icon icon-${t.icon}`}>
                        <ToolIcon name={t.icon} size={23} />
                      </span>
                      {"tag" in t ? (
                        <span className="popular">
                          <span />
                          {t.tag}
                        </span>
                      ) : (
                        <ArrowUpRight className="card-arrow" size={17} />
                      )}
                    </div>
                    <h3>{t.name}</h3>
                    <p>{t.description}</p>
                    <div className="card-bottom">
                      <span>{t.category}</span>
                      {t.status === "available" ? (
                        <span className="ready">
                          Open tool <ArrowRight size={13} />
                        </span>
                      ) : (
                        <span className="coming-soon">Coming soon</span>
                      )}
                    </div>
                  </Link>
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
                    Webhook Inspector. Capture requests, inspect every detail, and replay
                    with confidence.
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
      <section className="principles page-width" id="principles">
        <div className="principles-intro">
          <h2>
            Less in your way.
            <br />
            More in your flow.
          </h2>
          <p>
            A useful tool should feel simple. So we’re building a toolkit that gets out of
            your way and lets you get on with it.
          </p>
          <Link href="/tools/json-formatter" className="button lime-button">
            Find your flow <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="principles-list">
          <div>
            <span className="principle-icon">
              <ShieldCheck size={21} />
            </span>
            <h3>Your input. Your business.</h3>
            <p>
              The available utilities process your input on your device. The planned
              webhook tool will clearly explain its server-side storage.
            </p>
          </div>
          <div>
            <span className="principle-icon">
              <Zap size={21} />
            </span>
            <h3>Straight to the useful part.</h3>
            <p>
              No accounts, subscriptions, or hoops. Just the tool you need, when you need
              it.
            </p>
          </div>
          <div>
            <span className="principle-icon">
              <Sparkles size={21} />
            </span>
            <h3>A calmer kind of toolkit.</h3>
            <p>
              Considered details, familiar shortcuts, and a little more room to think.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

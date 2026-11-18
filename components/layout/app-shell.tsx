"use client";
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { brand } from "@/config/brand";
import { headerTools, tools } from "@/config/tools";
import { ToolIcon } from "@/components/cummon/tool-icon";
import { RamupodLogo } from "@/components/cummon/ramupod-logo";
import { SiteFooter } from "./site-footer";
import { SearchModal } from "@/components/layout/tool-search-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const modifier = useShortcutModifier();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [themeAnimation, setThemeAnimation] = useState<"idle" | "out" | "in">("idle");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const isToolPage = Boolean(path && path.startsWith("/tools/"));
  const toolSlug = isToolPage ? path.split("/")[2] : "";
  const toolTitle =
    tools.find((tool) => tool.slug === toolSlug)?.name ||
    toolSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  const [headerDetached, setHeaderDetached] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoverTime = useRef<number>(0);

  const clearCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const isTouchOrMobile = () => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(max-width: 640px)").matches ||
      !window.matchMedia("(hover: hover)").matches
    );
  };

  const handleToolsMouseEnter = () => {
    if (isTouchOrMobile()) return;
    clearCloseTimer();
    lastHoverTime.current = Date.now();
    setOpen(true);
  };

  const handleToolsMouseLeave = () => {
    if (isTouchOrMobile()) return;
    clearCloseTimer();
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleMenuMouseEnter = () => {
    if (isTouchOrMobile()) return;
    clearCloseTimer();
  };

  const handleMenuMouseLeave = () => {
    if (isTouchOrMobile()) return;
    clearCloseTimer();
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleOtherNavHover = () => {
    if (isTouchOrMobile()) return;
    clearCloseTimer();
    setOpen(false);
  };

  const handleToolsClick = () => {
    if (open && Date.now() - lastHoverTime.current < 400) {
      setOpen(true);
      return;
    }
    clearCloseTimer();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("al1-theme");
    } catch {
      /* Storage may be disabled. */
    }
    setDark(stored === "dark");
    document.documentElement.dataset.theme = stored === "dark" ? "dark" : "light";
  }, []);

  useEffect(() => {
    clearCloseTimer();
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!isToolPage) {
      setHeaderDetached(false);
      setHeaderVisible(true);
      return;
    }

    const mobile = window.matchMedia("(max-width: 640px)");
    let lastY = window.scrollY;
    let detached = window.scrollY > 12;
    setHeaderDetached(!mobile.matches && detached);
    setHeaderVisible(true);
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      if (mobile.matches) {
        setHeaderDetached(false);
        if (y <= 25 || y < lastY - 12 || open) {
          setHeaderVisible(true);
        } else if (y > 50 && y > lastY + 8) {
          setHeaderVisible(false);
        }
        lastY = y;
        return;
      }
      setHeaderVisible(true);
      // Stay detached while scrolling back up; reconnect only at the very top.
      const next = y === 0 ? false : y > 12 ? true : detached;
      if (next !== detached) {
        detached = next;
        setHeaderDetached(next);
      }
    };
    const handleResize = () => {
      detached = !mobile.matches && window.scrollY > 12;
      setHeaderDetached(detached);
      setHeaderVisible(true);
      lastY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    mobile.addEventListener("change", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      mobile.removeEventListener("change", handleResize);
    };
  }, [isToolPage, path, open]);

  // Global shortcut to open tool search modal when not on the homepage ("/")
  useEffect(() => {
    if (path === "/") {
      setSearchModalOpen(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
        return;
      }

      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        clearCloseTimer();
        setOpen(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearCloseTimer();
        setOpen(false);
        const activeButton =
          isToolPage || window.matchMedia("(max-width: 640px)").matches
            ? mobileMenuButton
            : menuButton;
        activeButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, isToolPage]);

  const theme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("al1-theme", next ? "dark" : "light");
    } catch {
      /* Storage may be disabled. */
    }
  };

  const closeMenu = () => {
    clearCloseTimer();
    setOpen(false);
  };

  return (
    <>
      <header
        ref={header}
        data-detached={isToolPage && headerDetached ? "true" : undefined}
        className={`site-header ${isToolPage ? "header-focus header-detail-mobile" : ""} ${isToolPage && !headerVisible ? "header-hidden" : ""}`}
      >
        <div
          className={`header-inner ${
            path === "/" ? "header-inner-home" : ""
          } ${isToolPage ? "header-inner-detail" : ""}`}
        >
          {isToolPage ? (
            <div className="workspace-brand">
              <RamupodLogo size={28} />
              <Link href="/" className="brand-wordmark" aria-label="Ramupod home">
                {brand.wordmark}
              </Link>
            </div>
          ) : (
            <div className="brand header-brand">
              <RamupodLogo />
              <Link href="/" className="brand-wordmark" aria-label="Ramupod home">
                {brand.wordmark}
              </Link>
            </div>
          )}

          {isToolPage && (
            <div
              className="header-mobile-tool-title"
              title={toolTitle}
              aria-hidden="true"
            >
              <span>{toolTitle}</span>
            </div>
          )}

          {!isToolPage && (
            <nav className="header-nav" aria-label="Main navigation">
              <Link
                href="/"
                aria-current={path === "/" ? "page" : undefined}
                onMouseEnter={handleOtherNavHover}
              >
                Home
              </Link>
              <button
                ref={menuButton}
                className={open ? "nav-trigger is-open" : "nav-trigger"}
                aria-expanded={open}
                aria-controls="tool-navigation"
                onClick={handleToolsClick}
                onMouseEnter={handleToolsMouseEnter}
                onMouseLeave={handleToolsMouseLeave}
              >
                Tools <ChevronDown size={15} />
              </button>
              <Link
                href="/#principles"
                onClick={closeMenu}
                onMouseEnter={handleOtherNavHover}
              >
                Our approach
              </Link>
            </nav>
          )}

          <div className="header-actions">
            {/* Wrapper grouping search, switcher mode, and burger icon */}
            <div className="header-actions-wrapper">
              {path !== "/" && (
                <button
                  type="button"
                  className="header-search-trigger"
                  onClick={() => setSearchModalOpen(true)}
                  aria-label={`Search tools (${modifier}+K)`}
                  title={`Search tools (${modifier}+K)`}
                >
                  <Search size={15} />
                  <span className="search-trigger-text">Search…</span>
                  <span className="search-trigger-kbd">
                    <kbd>{modifier}</kbd>
                    <kbd>K</kbd>
                  </span>
                </button>
              )}
              <button
                type="button"
                className="icon-button theme-button"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                aria-disabled={themeAnimation !== "idle"}
                onClick={() => {
                  if (themeAnimation !== "idle") return;
                  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    theme();
                    return;
                  }
                  setThemeAnimation("out");
                }}
              >
                <span
                  className="theme-button-icon"
                  data-animation={themeAnimation}
                  aria-hidden="true"
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (themeAnimation === "out") {
                      theme();
                      setThemeAnimation("in");
                    } else {
                      setThemeAnimation("idle");
                    }
                  }}
                >
                  {dark ? <Sun size={19} /> : <Moon size={19} />}
                </span>
              </button>
              <button
                ref={mobileMenuButton}
                className="icon-button mobile-menu"
                aria-label={
                  open
                    ? "Close navigation"
                    : isToolPage
                      ? "More tools"
                      : "Open navigation"
                }
                aria-expanded={open}
                aria-controls="tool-navigation"
                onClick={() => setOpen(!open)}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {!isToolPage && (
              <Link href="/tools/json-formatter" className="button primary header-cta">
                Open workspace <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {open && (
          <nav
            className="header-menu"
            id="tool-navigation"
            aria-label="Tool navigation"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                clearCloseTimer();
                setOpen(false);
              }
            }}
          >
            <div className="mobile-nav-links">
              <Link href="/" onClick={closeMenu}>
                Home
              </Link>
              <Link href="/#tools" onClick={closeMenu}>
                All tools
              </Link>
              <Link href="/#principles" onClick={closeMenu}>
                Our approach
              </Link>
            </div>
            <div className="menu-heading">
              <span>TOP 9 TOOLS</span>
              <span>Free. No account needed.</span>
            </div>
            <div className="menu-tool-grid">
              {headerTools.map((tool, rank) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={closeMenu}
                  aria-current={path === `/tools/${tool.slug}` ? "page" : undefined}
                >
                  <ToolIcon name={tool.icon} />
                  <span>
                    <span className="menu-tool-rank">
                      {String(rank + 1).padStart(2, "0")}
                    </span>
                    {tool.name}
                    <small>
                      {tool.status === "available"
                        ? tool.description
                        : "Coming soon (In development)"}
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
            <div className="menu-footer">
              <span>More tools for whatever comes next.</span>
              <Link href="/#tools" onClick={closeMenu} className="menu-see-all">
                View all tools <ArrowUpRight size={14} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className={isToolPage ? "workspace-focused" : undefined}>
        {children}
      </main>
      <SiteFooter />

      {/* Quick Tool Search Modal (Accessible anywhere outside homepage) */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}

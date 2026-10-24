"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { tools } from "@/lib/tools";
import { ToolIcon } from "./icon";
import { BrandLogo } from "./brand-logo";
import { SearchModal } from "./search-modal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
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
    const stored = localStorage.getItem("al1-theme");
    setDark(stored === "dark");
    document.documentElement.dataset.theme = stored === "dark" ? "dark" : "light";
  }, []);
  useEffect(() => {
    clearCloseTimer();
    setOpen(false);
  }, [path]);

  // Global shortcut to open tool search modal when not on the homepage ("/")
  useEffect(() => {
    if (path === "/") {
      setSearchModalOpen(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
        const activeButton = window.matchMedia("(max-width: 640px)").matches
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
  }, [open]);
  function theme() {
    setDark(!dark);
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("al1-theme", dark ? "light" : "dark");
  }
  function closeMenu() {
    clearCloseTimer();
    setOpen(false);
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" ref={header}>
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Al1 Developer Tools home">
            <BrandLogo size={36} />
            <span>
              Al1 <span className="brand-name">Developer Tools</span>
            </span>
          </Link>
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
          <div className="header-actions">
            {path !== "/" && (
              <button
                type="button"
                className="header-search-trigger"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Search tools (⌘K)"
                title="Search tools (⌘K)"
              >
                <Search size={15} />
                <span className="search-trigger-text">Search…</span>
                <span className="search-trigger-kbd">
                  <kbd>⌘</kbd>
                  <kbd>K</kbd>
                </span>
              </button>
            )}
            <button
              className="icon-button theme-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={theme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link href="/tools/json-formatter" className="button primary header-cta">
              Open workspace <ArrowUpRight size={16} />
            </Link>
            <button
              ref={mobileMenuButton}
              className="icon-button mobile-menu"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="tool-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
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
              <span>YOUR EVERYDAY TOOLKIT</span>
              <span>Free. No account needed.</span>
            </div>
            <div className="menu-tool-grid">
              {tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={closeMenu}
                  aria-current={path === `/tools/${tool.slug}` ? "page" : undefined}
                >
                  <ToolIcon name={tool.icon} />
                  <span>
                    {tool.name}
                    <small>
                      {tool.phase === 1
                        ? tool.description
                        : "Coming soon (In development)"}
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link href="/" className="brand footer-brand">
            <BrandLogo size={32} />
            <span>Al1 Developer Tools</span>
          </Link>
          <span>Less friction. More building.</span>
          <span>© {new Date().getFullYear()} Al1</span>
          <Link href="/#tools">
            Explore the toolkit <ArrowUpRight size={14} />
          </Link>
        </div>
      </footer>
      {/* Quick Tool Search Modal (Accessible anywhere outside homepage) */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}

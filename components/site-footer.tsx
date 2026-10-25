import Link from "next/link";
import { ArrowUpRight, GitFork, Mail } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { creator } from "@/lib/creator";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-shell">
        <div className="footer-main">
          <div className="footer-identity">
            <Link href="/" className="brand footer-logo">
              <BrandLogo size={32} />
              <span>Al1 Developer Tools</span>
            </Link>
            <p className="footer-tagline">Less friction. More building.</p>
          </div>
          <div className="footer-navigation">
            <nav className="footer-tool-links" aria-label="Explore the toolkit">
              <Link href="/#tools">All tools</Link>
              <Link href="/tools/notes">Notes</Link>
              <Link href="/about">About</Link>
            </nav>
            <span className="footer-nav-divider" aria-hidden="true" />
            <nav className="footer-social-links" aria-label="Connect with the creator">
              <a
                href={creator.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
              >
                <GitFork size={16} />
              </a>
              <a
                href={creator.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <span className="footer-linkedin-mark" aria-hidden="true">
                  in
                </span>
              </a>
              <a
                href={`mailto:${creator.email}`}
                aria-label="Email Aldo"
                title="Email Aldo"
              >
                <Mail size={16} />
              </a>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copyright">
            © {new Date().getFullYear()} Al1 Developer Tools
          </span>
          <p className="footer-maker">
            Designed &amp; built by{" "}
            <Link href="/about" rel="author">
              {creator.name}
              <ArrowUpRight size={11} />
            </Link>
          </p>
          <nav className="footer-policy-links" aria-label="Legal information">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <a href="/audio/ATTRIBUTION.txt">Sound credits</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

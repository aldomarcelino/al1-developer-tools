import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail, ShieldCheck, FileText } from "lucide-react";
import { creator } from "@/lib/creator";
import type { LegalDocument } from "@/lib/legal";

export function LegalPage({ document }: { document: LegalDocument }) {
  const privacy = document.path === "/privacy";
  const Icon = privacy ? ShieldCheck : FileText;
  return (
    <div className="legal-page page-width">
      <Link href="/" className="text-button legal-back">
        <ArrowLeft size={15} /> Back to the toolkit
      </Link>
      <header className="legal-intro">
        <span className="legal-eyebrow">
          <Icon size={16} /> THE DETAILS, IN PLAIN LANGUAGE
        </span>
        <h1>{document.title}</h1>
        <p>{document.summary}</p>
        <div className="legal-meta">
          Last updated <time dateTime={document.updated}>25 October 2026</time>
          <span aria-hidden="true">·</span>
          <Link href={privacy ? "/terms" : "/privacy"}>
            {privacy ? "Terms of Use" : "Privacy Policy"}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      <nav className="legal-contents" aria-label="On this page">
        <span>ON THIS PAGE</span>
        <div>
          {document.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </div>
      </nav>
      <div className="legal-body">
        {document.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
          >
            <span className="legal-section-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.id === "hosting" && (
                <a
                  className="legal-inline-link"
                  href="https://www.cloudflare.com/privacypolicy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cloudflare Privacy Policy <ArrowUpRight size={13} />
                </a>
              )}
              {section.id === "privacy" && (
                <Link className="legal-inline-link" href="/privacy">
                  Read the Privacy Policy <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="legal-contact">
        <div>
          <h2>Have a question?</h2>
          <p>There is a person behind these tools. Get in touch.</p>
        </div>
        <a className="button" href={`mailto:${creator.email}`}>
          <Mail size={15} /> Contact us
        </a>
      </div>
    </div>
  );
}

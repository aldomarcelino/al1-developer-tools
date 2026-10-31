"use client";

import { useState } from "react";
import { Check, Code2, Copy, Download, Mail, ArrowLeft, Ticket } from "lucide-react";
import { creator } from "@/config/creator";

export function MakerCard() {
  const [flipped, setFlipped] = useState(false);
  const [notice, setNotice] = useState("");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(creator.email);
      setNotice("Email copied.");
    } catch {
      setNotice("Copy unavailable. Use the email link instead.");
    }
  }
  function saveContact() {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${creator.fullName}`,
      `N:;${creator.fullName};;;`,
      `TITLE:${creator.role}`,
      `EMAIL;TYPE=INTERNET:${creator.email}`,
      `URL:${creator.linkedin}`,
      "END:VCARD",
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([vcard], { type: "text/vcard;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "Aldo-Marcelino.vcf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Contact card downloaded.");
  }
  return (
    <aside className="maker-ticket" aria-label="Aldo Marcelino digital business card">
      <div className="ticket-topline">
        <span>
          <Ticket size={15} /> MAKER PASS
        </span>
        <button
          type="button"
          className={`ticket-flip ${flipped ? "is-back" : "is-searching"}`}
          onClick={() => {
            setFlipped(!flipped);
            setNotice("");
          }}
          aria-label={flipped ? "Back to profile" : "Connect"}
          title={flipped ? "Back to profile" : "Make a connection"}
          aria-expanded={flipped}
          aria-controls="maker-card-contact"
        >
          {flipped ? (
            <ArrowLeft size={17} aria-hidden="true" />
          ) : (
            <>
              <span className="ticket-signal" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>Connect</span>
              <span className="ticket-signal-ping" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      <div className={`ticket-body ${flipped ? "is-flipped" : ""}`}>
        <div className="ticket-face ticket-front" aria-hidden={flipped} inert={flipped}>
          <Code2 size={38} strokeWidth={1.25} />
          <span className="ticket-label">DESIGNED & BUILT BY</span>
          <strong>{creator.name}</strong>
          <p>{creator.role}</p>
          <div className="ticket-tags">
            <span>Frontend</span>
            <span>Backend</span>
            <span>Product</span>
          </div>
          <p className="ticket-intro">
            A little curiosity.
            <br />A lot of care in the details.
          </p>
        </div>
        <div
          className="ticket-face ticket-back"
          id="maker-card-contact"
          aria-hidden={!flipped}
          inert={!flipped}
        >
          <span className="ticket-label">KEEP IN TOUCH</span>
          <strong>Let’s connect.</strong>
          <p>A role, a product, or a good engineering conversation.</p>
          <a
            href={creator.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="ticket-primary"
          >
            Connect on LinkedIn
          </a>
          <a href={`mailto:${creator.email}`} className="ticket-email">
            <Mail size={14} />
            <span>{creator.email}</span>
          </a>
          <div className="ticket-actions">
            <button type="button" onClick={copyEmail}>
              {notice === "Email copied." ? <Check size={14} /> : <Copy size={14} />} Copy
              email
            </button>
            <button type="button" onClick={saveContact}>
              <Download size={14} /> Save contact
            </button>
          </div>
          <a
            href={creator.github}
            target="_blank"
            rel="noopener noreferrer"
            className="ticket-github"
          >
            Explore my GitHub
          </a>
          <span role="status" className="ticket-notice">
            {notice}
          </span>
        </div>
      </div>
      <div className="ticket-stub">
        <div>
          <span>RAMUPOD / USEFUL ONLINE TOOLS</span>
          <span>From interface to implementation.</span>
        </div>
        <span className="ticket-barcode" aria-hidden="true" />
      </div>
      <a
        href="https://github.com/aldomarcelino/al1-developer-tools/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        className="ticket-issue"
      >
        Found something? Open a GitHub issue
      </a>
    </aside>
  );
}

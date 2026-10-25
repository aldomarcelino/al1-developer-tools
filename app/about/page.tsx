import Link from "next/link";
import { ArrowLeft, Code2, Link2, Mail } from "lucide-react";
import { creator } from "@/lib/creator";
import { pageMetadata } from "@/lib/seo";
import { MakerCard } from "@/components/maker-card";
import { CreatorStructuredData } from "@/components/seo-structured-data";

export const metadata = pageMetadata(
  "Aldo Marcelino NF Lubis — About the Maker",
  "Meet Aldo Marcelino NF Lubis, the full-stack software engineer behind Al1 Developer Tools. Explore his engineering approach and connect on LinkedIn or by email.",
  "/about"
);
export default function AboutPage() {
  return (
    <div className="maker-page page-width">
      <CreatorStructuredData />
      <Link className="text-button maker-back" href="/">
        <ArrowLeft size={15} /> Back to the toolkit
      </Link>
      <section className="maker-intro" aria-labelledby="maker-title">
        <div>
          <span className="maker-eyebrow">THE PERSON BEHIND AL1</span>
          <h1 id="maker-title">{creator.fullName}</h1>
          <p className="maker-lead">
            You can call me Aldo. Useful tools, with a human behind them.
          </p>
          <p>
            A full-stack software engineer who cares about how software works, and how it
            feels to use. I built Al1 Developer Tools to make the small, repetitive parts
            of development a little easier.
          </p>
          <div className="maker-links">
            <a href={creator.linkedin} target="_blank" rel="noopener noreferrer">
              <Link2 size={17} /> Connect on LinkedIn
            </a>
            <a href={`mailto:${creator.email}`}>
              <Mail size={17} /> Get in touch
            </a>
          </div>
        </div>
        <MakerCard />
      </section>
      <section className="maker-principles" aria-label="Why I built this toolkit">
        <article>
          <span>01 / PURPOSE</span>
          <h2>Small tasks deserve good tools.</h2>
          <p>
            Formatting a payload, comparing changes, or checking a timestamp should take a
            moment. Each utility has a focused workspace for that task.
          </p>
        </article>
        <article>
          <span>02 / ENGINEERING</span>
          <h2>Thoughtful at every layer.</h2>
          <p>
            This toolkit brings together TypeScript, reusable interfaces, browser-side
            processing, and automated tests. The available utilities process input
            locally; the upcoming webhook feature will explain its server-side storage
            separately.
          </p>
        </article>
        <article>
          <span>03 / CONNECTION</span>
          <h2>Let’s build something useful.</h2>
          <p>
            For software engineering roles, remote team opportunities, or product
            collaborations, LinkedIn and email are the best ways to reach me.
          </p>
        </article>
      </section>
      <section className="maker-contact" aria-labelledby="maker-contact-title">
        <div>
          <span className="maker-eyebrow">START A CONVERSATION</span>
          <h2 id="maker-contact-title">Have a product or a role in mind?</h2>
          <a className="maker-email" href={`mailto:${creator.email}`}>
            {creator.email}
          </a>
        </div>
        <a
          href={creator.github}
          className="text-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Code2 size={18} /> Explore my GitHub
        </a>
      </section>
    </div>
  );
}

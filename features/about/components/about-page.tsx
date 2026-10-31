import styles from "../styles.module.css";
import Link from "next/link";
import { ArrowLeft, Code2, Link2, Mail } from "lucide-react";
import { creator } from "@/config/creator";
import { MakerCard } from "@/features/about/components/maker-card";
import { AboutStructuredData } from "@/components/cummon/structured-data";

export function AboutPage() {
  return (
    <div className={`maker-page page-width ${styles.scope}`}>
      <AboutStructuredData />
      <Link className="text-button maker-back" href="/">
        <ArrowLeft size={15} /> Back to the toolkit
      </Link>
      <section className="maker-intro" aria-labelledby="maker-title">
        <div>
          <span className="maker-eyebrow">INDEPENDENT. USEFUL. OPEN TO EVERYONE.</span>
          <h1 id="maker-title">About Ramupod</h1>
          <p className="maker-lead">Useful tools. Less effort.</p>
          <p>
            Ramupod brings useful online tools together in one place. Write notes, work
            with text and data, and make everyday tasks a little easier without creating
            an account.
          </p>
          <p>
            Created and maintained by {creator.fullName}, an independent full-stack
            software engineer. The product stands on a simple idea: good tools should be
            easy for anyone to use.
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
      <section className="maker-principles" aria-label="Why Ramupod exists">
        <article>
          <span>01 / PURPOSE</span>
          <h2>Small tasks deserve good tools.</h2>
          <p>
            Taking notes, checking text length, formatting data, or comparing changes
            should take a moment. Each tool has a focused workspace for that task.
          </p>
        </article>
        <article>
          <span>02 / ENGINEERING</span>
          <h2>Thoughtful at every layer.</h2>
          <p>
            This toolkit brings together TypeScript, reusable interfaces, browser-side
            processing, and automated tests. Most utilities process input locally; IP
            inspection explains its Cloudflare endpoint and optional external network
            checks separately.
          </p>
        </article>
        <article>
          <span>03 / CONNECTION</span>
          <h2>Let’s build something useful.</h2>
          <p>
            For product feedback, questions, or collaborations, reach the creator through
            LinkedIn or email.
          </p>
        </article>
      </section>
      <section className="maker-contact" aria-labelledby="maker-contact-title">
        <div>
          <span className="maker-eyebrow">START A CONVERSATION</span>
          <h2 id="maker-contact-title">Have a question or an idea?</h2>
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
          <Code2 size={18} /> Explore the creator’s GitHub
        </a>
      </section>
    </div>
  );
}

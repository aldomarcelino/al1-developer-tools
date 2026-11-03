import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";
import { ToolIcon } from "@/components/cummon/tool-icon";

export function HeroSection({ activeToolCount }: { activeToolCount: number }) {
  return (
    <section className="hero page-width">
      <h1>
        Useful tools.
        <br />
        <span>Less effort.</span>
      </h1>
      <p>
        {brand.name} brings useful tools for documents, text, data, and everyday tasks
        together in one place.
      </p>
      <div className="hero-actions">
        <Link href="/tools/screen-recorder" className="button primary">
          Get started <ArrowUpRight size={17} />
        </Link>
        <a href="#tools" className="button secondary">
          Explore tools <ArrowDown size={16} />
        </a>
      </div>
      <div className="hero-bottom">
        <span>
          <ShieldCheck size={16} /> Most tools run in your browser
        </span>
        <i />
        <span>
          <Check size={16} /> Free. No account needed.
        </span>
      </div>
      <div className="hero-showcase">
        <Link
          href="/tools/screen-recorder"
          className="showcase-azure"
          aria-label="Open Screen Recorder"
        >
          <span className="showcase-top">
            <ToolIcon name="video" size={29} />
            <ArrowUpRight size={20} />
          </span>
          <span className="showcase-rec-preview" aria-hidden="true">
            <span className="showcase-rec-badge">
              <span className="showcase-rec-dot" /> REC
              <span className="showcase-rec-timer">41:20</span>
            </span>
            <span className="showcase-rec-specs">
              <span>1080p · 60fps</span>
              <small>Mic · Cam · No watermark</small>
            </span>
          </span>
          <span className="showcase-title">
            Clean tab capture.
            <br />
            Local review.
          </span>
          <span className="showcase-caption">Screen Recorder &amp; Video Hub</span>
        </Link>
        <div className="showcase-lime">
          <ShieldCheck size={29} />
          <div>
            <span className="showcase-number">100%</span>
            <h2>On your device.</h2>
            <p>
              Your data stays in your browser.
              <br />
              Right where it belongs.
            </p>
          </div>
        </div>
        <Link
          href="/tools/json-formatter"
          className="showcase-editor showcase-json"
          aria-label="Open JSON Formatter and Validator"
        >
          <div className="mini-editor-bar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <span>example.json</span>
            <ArrowUpRight size={17} />
          </div>
          <pre aria-hidden="true">
            <span className="mini-line">01</span>
            {" {"}
            <br />
            <span className="mini-line">02</span>
            {"   "}
            <span className="mini-key">&quot;name&quot;</span>
            {": "}
            <span className="mini-string">&quot;Ramupod&quot;</span>,<br />
            <span className="mini-line">03</span>
            {"   "}
            <span className="mini-key">&quot;tools&quot;</span>
            {": "}
            {activeToolCount},<br />
            <span className="mini-line">04</span>
            {"   "}
            <span className="mini-key">&quot;effort&quot;</span>
            {": "}
            <span className="mini-string">&quot;less&quot;</span>,<br />
            <span className="mini-line">05</span>
            {"   "}
            <span className="mini-key">&quot;ready&quot;</span>
            {": "}
            <span className="mini-bool">true</span>
            <br />
            <span className="mini-line">06</span>
            {" }"}
            <span className="mini-cursor" />
          </pre>
          <div className="mini-editor-status">
            <span>
              <Check size={13} /> Valid JSON
            </span>
            <span>Format. Validate. Minify.</span>
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
  );
}

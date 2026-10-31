import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";
import { ToolIcon } from "@/components/cummon/tool-icon";
import imageExample from "@/public/previews/compression-example.json";

export function HeroSection({ activeToolCount }: { activeToolCount: number }) {
  return (
    <section className="hero page-width">
      <h1>
        Useful tools.
        <br />
        <span>Less effort.</span>
      </h1>
      <p>{brand.description}</p>
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
          <ShieldCheck size={16} /> Most tools run in your browser
        </span>
        <i />
        <span>
          <Check size={16} /> Free. No account needed.
        </span>
      </div>
      <div className="hero-showcase">
        <Link
          href="/tools/image-compressor"
          className="showcase-azure"
          aria-label="Open Image Compressor and Converter"
        >
          <span className="showcase-top">
            <ToolIcon name="image" size={29} />
            <ArrowUpRight size={20} />
          </span>
          <span className="showcase-image-preview" aria-hidden="true">
            <span className="showcase-image-thumb">
              <Image
                src="/previews/landscape.webp"
                width={imageExample.width}
                height={imageExample.height}
                alt=""
                unoptimized
              />
            </span>
            <span className="showcase-image-sizes">
              <span>
                JPG <s>{(imageExample.originalBytes / 1024).toFixed(1)} KB</s>
              </span>
              <span>
                WebP <strong>{(imageExample.optimizedBytes / 1024).toFixed(1)} KB</strong>
              </span>
              <small>Example result</small>
            </span>
          </span>
          <span className="showcase-title">
            A little lighter.
            <br />A lot more room.
          </span>
          <span className="showcase-caption">Image Compressor &amp; Converter</span>
        </Link>
        <div className="showcase-lime">
          <ShieldCheck size={29} />
          <div>
            <span className="showcase-number">100%</span>
            <h2>On your device.</h2>
            <p>
              Your JSON stays in your browser.
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

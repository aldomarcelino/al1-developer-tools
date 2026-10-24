"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  CustomKeyOptions,
  generateCustomKey,
  generateKeySuite,
  KeyItem,
} from "@/lib/keygen";
import { ToolHeader } from "@/components/tool-header";
import { SegmentedTabs } from "@/components/segmented-tabs";

export function KeygenWorkspace() {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [masked, setMasked] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("Cryptographically secure keys generated.");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [spinningId, setSpinningId] = useState<string | null>(null);

  // Custom key generator state
  const [customOptions, setCustomOptions] = useState<CustomKeyOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [customKey, setCustomKey] = useState("");

  // Initialize keys on mount to avoid SSR randomness mismatch
  useEffect(() => {
    setKeys(generateKeySuite());
    setCustomKey(
      generateCustomKey({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      })
    );
  }, []);

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleRegenerateAll = () => {
    setIsGeneratingAll(true);
    setKeys(generateKeySuite());
    setCustomKey(generateCustomKey(customOptions));
    setNoticeWithTimeout("Generated fresh batch of cryptographically secure keys.");
    setTimeout(() => setIsGeneratingAll(false), 550);
  };

  const handleRegenerateCustom = (opts = customOptions) => {
    setIsGeneratingCustom(true);
    setCustomKey(generateCustomKey(opts));
    setTimeout(() => setIsGeneratingCustom(false), 550);
  };

  const handleRegenerateSingle = (id: string, title: string) => {
    setSpinningId(id);
    const freshSuite = generateKeySuite();
    const target = freshSuite.find((k) => k.id === id);
    if (target) {
      setKeys((prev) => prev.map((k) => (k.id === id ? target : k)));
      setNoticeWithTimeout(`Regenerated ${title}.`);
    }
    setTimeout(() => setSpinningId(null), 550);
  };

  const handleCopy = async (text: string, id: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setNoticeWithTimeout(`Copied ${label} to clipboard.`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy key.");
    }
  };

  const filteredKeys = useMemo(() => {
    if (activeCategory === "all") return keys;
    return keys.filter((k) => k.category === activeCategory);
  }, [keys, activeCategory]);

  return (
    <div className="workspace-page page-width">
      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Random Keygen" icon={<Key size={24} />} />

      {/* Top Generator Control Bar */}
      <div className="keygen-control-card">
        <div className="keygen-control-left">
          <button
            type="button"
            className="button primary"
            onClick={handleRegenerateAll}
            title="Generate new random keys"
          >
            <RefreshCw size={14} className={isGeneratingAll ? "spin-icon" : ""} />
            Generate New Keys
          </button>

          <button
            type="button"
            className="button"
            onClick={() => setMasked(!masked)}
            title={masked ? "Reveal keys" : "Mask keys for screen privacy"}
          >
            {masked ? <Eye size={14} /> : <EyeOff size={14} />}
            {masked ? "Show Keys" : "Mask Keys"}
          </button>
        </div>

        <span
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={14} />
          <span>Web Cryptography API (CSPRNG)</span>
        </span>
      </div>

      {/* Custom Key Generator Builder */}
      <div className="keygen-custom-card">
        <div className="keygen-custom-header">
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <Sliders size={14} />
            Custom Key Builder
          </span>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Length: <strong>{customOptions.length}</strong> chars
          </span>
        </div>

        <div className="keygen-custom-options">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="range"
              min={8}
              max={64}
              value={customOptions.length}
              onChange={(e) => {
                const len = Number(e.target.value);
                const opts = { ...customOptions, length: len };
                setCustomOptions(opts);
                handleRegenerateCustom(opts);
              }}
              style={{ width: "120px", accentColor: "var(--accent)" }}
            />
          </div>

          <label>
            <input
              type="checkbox"
              checked={customOptions.uppercase}
              onChange={(e) => {
                const opts = { ...customOptions, uppercase: e.target.checked };
                setCustomOptions(opts);
                handleRegenerateCustom(opts);
              }}
            />
            <span>A-Z</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={customOptions.lowercase}
              onChange={(e) => {
                const opts = { ...customOptions, lowercase: e.target.checked };
                setCustomOptions(opts);
                handleRegenerateCustom(opts);
              }}
            />
            <span>a-z</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={customOptions.numbers}
              onChange={(e) => {
                const opts = { ...customOptions, numbers: e.target.checked };
                setCustomOptions(opts);
                handleRegenerateCustom(opts);
              }}
            />
            <span>0-9</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={customOptions.symbols}
              onChange={(e) => {
                const opts = { ...customOptions, symbols: e.target.checked };
                setCustomOptions(opts);
                handleRegenerateCustom(opts);
              }}
            />
            <span>Symbols (!@#$)</span>
          </label>

          <button
            type="button"
            className="button"
            onClick={() => handleRegenerateCustom()}
            style={{
              padding: "3px 10px",
              fontSize: "11px",
              minHeight: "26px",
              marginLeft: "auto",
            }}
          >
            <RefreshCw size={12} className={isGeneratingCustom ? "spin-icon" : ""} />
            Regenerate
          </button>
        </div>

        <div className="keygen-custom-output-box">
          <span className="keygen-custom-val">
            {masked ? "•".repeat(customKey.length || 20) : customKey}
          </span>
          <button
            type="button"
            className={`keygen-copy-pill ${copiedId === "custom" ? "copied" : ""}`}
            onClick={() => handleCopy(customKey, "custom", "Custom Key")}
            title="Copy custom key"
          >
            {copiedId === "custom" ? <Check size={12} /> : <Copy size={12} />}
            {copiedId === "custom" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ marginBottom: "1rem", overflowX: "auto", paddingBottom: "2px" }}>
        <SegmentedTabs<string>
          value={activeCategory}
          onChange={(val) => setActiveCategory(val)}
          options={[
            { value: "all", label: "All Keys", badge: keys.length },
            { value: "passwords", label: "Passwords & Phrases" },
            { value: "keys", label: "Cryptographic & Hex Secrets" },
            { value: "tokens", label: "UUIDs & Tokens" },
            { value: "numeric", label: "PINs & Numeric" },
          ]}
        />
      </div>

      {/* Key Items List */}
      <div className="keygen-list">
        {filteredKeys.map((item) => (
          <div key={item.id} className="keygen-item-card">
            <div className="keygen-item-top">
              <span className="keygen-item-title">{item.title}</span>
              <span className="keygen-item-desc">{item.description}</span>
            </div>

            <div
              className="keygen-item-val-box"
              onClick={() => handleCopy(item.value, item.id, item.title)}
              title="Click to copy"
            >
              <span className="keygen-item-val">
                {masked ? "•".repeat(item.value.length) : item.value}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <button
                  type="button"
                  className="keygen-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateSingle(item.id, item.title);
                  }}
                  title="Regenerate this key"
                  aria-label={`Regenerate ${item.title}`}
                >
                  <RefreshCw size={12} className={spinningId === item.id ? "spin-icon" : ""} />
                </button>
                <button
                  type="button"
                  className={`keygen-copy-pill ${copiedId === item.id ? "copied" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(item.value, item.id, item.title);
                  }}
                >
                  {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === item.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback banner */}
      {notice && (
        <div className="feedback success" style={{ marginTop: "18px" }}>
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Documentation Section (without eyebrow) */}
      <section className="workspace-docs" style={{ marginTop: "24px" }}>
        <div>
          <h2>Cryptographically Strong Keys & Secrets</h2>
          <p>
            Generated using high-entropy entropy pools via the Web Cryptography API
            (CSPRNG). Never transmitted across networks or cached on servers.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>Cryptographic Randomness (CSPRNG)</strong>
              Uses hardware-backed entropy (<code>crypto.getRandomValues</code>) ensuring
              true unpredictability suitable for production secrets.
            </span>
          </p>
          <p>
            <Lock size={18} />
            <span>
              <strong>100% Client-Side Privacy</strong>
              All tokens, passwords, and cryptographic keys exist solely in your local
              browser memory and are destroyed when you close the tab.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

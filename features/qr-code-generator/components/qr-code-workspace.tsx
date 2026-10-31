/* eslint-disable @next/next/no-img-element -- Local blob/data previews must stay in the browser without server image optimization. */
"use client";

import { useEffect, useState } from "react";
import { QrCode, Download } from "lucide-react";
import { wifiPayload } from "@/features/qr-code-generator/lib/qr-code";
import { downloadBlob } from "@/lib/browser/download";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";

type QrResult = { key: string; png: string; svg: string };
export function QrCodeWorkspace() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [result, setResult] = useState<QrResult | null>(null);
  const [error, setError] = useState("");
  const payload =
    mode === "text" ? text : ssid ? wifiPayload(ssid, password, security, hidden) : "";
  const key = JSON.stringify([payload, size, level]);
  const current = result?.key === key ? result : null;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!payload) {
        setResult(null);
        setError("");
        return;
      }
      try {
        const qr = await import("qrcode");
        const options = { width: size, margin: 4, errorCorrectionLevel: level };
        const [png, svg] = await Promise.all([
          qr.toDataURL(payload, options),
          qr.toString(payload, { ...options, type: "svg" }),
        ]);
        if (active) {
          setResult({ key, png, svg });
          setError("");
        }
      } catch {
        if (active) {
          setResult(null);
          setError(
            "Could not generate this QR code. Try shorter content or lower error correction."
          );
        }
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [payload, size, level, key]);
  return (
    <div className="workspace-page page-width utility-tool">
      <ToolHeader title="QR Code Generator" icon={<QrCode size={24} />} />
      <div className="utility-grid">
        <section className="utility-panel utility-form" aria-label="QR code settings">
          <CustomSelect
            layout="stacked"
            label="Content type"
            value={mode}
            onChange={setMode}
            options={[
              { value: "text", label: "Text or URL" },
              { value: "wifi", label: "Wi-Fi network" },
            ]}
          />
          {mode === "text" ? (
            <label className="utility-field">
              Text or URL
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://example.com"
                maxLength={3000}
                spellCheck={false}
              />
              <span className="utility-hint">
                {text.length} / 3,000 characters. Links are encoded as entered.
              </span>
            </label>
          ) : (
            <>
              <label className="utility-field">
                Network name (SSID)
                <input
                  value={ssid}
                  maxLength={100}
                  onChange={(e) => setSsid(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <CustomSelect
                layout="stacked"
                label="Security"
                value={security}
                onChange={(value) => setSecurity(value as typeof security)}
                options={[
                  { value: "WPA", label: "WPA / WPA2 / WPA3 personal" },
                  { value: "WEP", label: "WEP" },
                  { value: "nopass", label: "Open network" },
                ]}
              />
              {security !== "nopass" && (
                <label className="utility-field">
                  Password
                  <input
                    type="password"
                    value={password}
                    maxLength={256}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              )}
              <label className="utility-check">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                />
                Hidden network
              </label>
              <p className="utility-hint">
                The QR code includes your network credentials. Share it only with your
                guests.
              </p>
            </>
          )}
          <div className="utility-columns">
            <CustomSelect
              layout="stacked"
              label="Export size"
              value={String(size)}
              onChange={(value) => setSize(Number(value))}
              options={[256, 512, 1024, 2048].map((n) => ({
                value: String(n),
                label: `${n} × ${n} px`,
              }))}
            />
            <CustomSelect
              layout="stacked"
              label="Error correction"
              value={level}
              onChange={(value) => setLevel(value as typeof level)}
              options={[
                { value: "L", label: "Low · 7%" },
                { value: "M", label: "Medium · 15%" },
                { value: "Q", label: "Quartile · 25%" },
                { value: "H", label: "High · 30%" },
              ]}
            />
          </div>
        </section>
        <section className="utility-panel utility-preview" aria-label="QR code preview">
          <div className="qr-preview">
            {current ? (
              <img src={current.png} alt="Generated QR code" width={size} height={size} />
            ) : (
              <div className="utility-empty">
                <QrCode size={64} strokeWidth={1} />
                <p>
                  {payload
                    ? error || "Preparing preview…"
                    : "Add content to create your QR code."}
                </p>
              </div>
            )}
          </div>
          <div className="utility-toolbar">
            <button
              className="button primary"
              disabled={!current}
              onClick={() => {
                if (!current) return;
                const a = document.createElement("a");
                a.href = current.png;
                a.download = "qr-code.png";
                a.click();
              }}
            >
              <Download size={14} />
              PNG
            </button>
            <button
              className="button"
              disabled={!current}
              onClick={() =>
                current &&
                downloadBlob(
                  new Blob([current.svg], { type: "image/svg+xml" }),
                  "qr-code.svg"
                )
              }
            >
              <Download size={14} />
              SVG
            </button>
          </div>
          <p className="utility-hint">
            Black on white, with a scan-friendly margin. Test before printing.
          </p>
        </section>
      </div>
      <p className="utility-notice" role="status">
        {error || (current ? "QR code ready to download." : "")}
      </p>
    </div>
  );
}

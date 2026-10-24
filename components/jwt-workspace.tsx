"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code,
  Copy,
  FileKey,
  Info,
  Lock,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { parseJwt, sampleTokens } from "@/lib/jwt";
import { ToolHeader } from "@/components/tool-header";
import { ClearButton } from "@/components/clear-button";

export function JwtWorkspace() {
  const [token, setToken] = useState(sampleTokens.valid);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [notice, setNotice] = useState("Paste your JWT to inspect.");

  const uploadRef = useRef<HTMLInputElement>(null);

  // Parse token reactively
  const decoded = useMemo(() => parseJwt(token), [token]);

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleCopy = async (text: string, type: "payload" | "header" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "payload") {
        setCopiedPayload(true);
        setTimeout(() => setCopiedPayload(false), 2000);
      } else if (type === "header") {
        setCopiedHeader(true);
        setTimeout(() => setCopiedHeader(false), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
      setNoticeWithTimeout(`Copied ${type} to clipboard.`);
    } catch {
      setNoticeWithTimeout("Failed to copy to clipboard.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNoticeWithTimeout("Please choose a file smaller than 2 MB.");
      if (uploadRef.current) uploadRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      setToken(text.trim());
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read token file.");
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  return (
    <div className="workspace-page page-width">
      <input
        ref={uploadRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleUpload}
      />

      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="JWT Decoder" icon={<FileKey size={24} />} />

      {/* Top Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <button
            className="button primary"
            onClick={() => handleCopy(decoded.payloadJson, "payload")}
            title="Copy decoded payload JSON"
          >
            {copiedPayload ? <Check size={14} /> : <Copy size={14} />}
            {copiedPayload ? "Copied!" : "Copy Payload"}
          </button>
          <button
            className="button"
            onClick={() =>
              handleCopy(
                JSON.stringify(
                  { header: decoded.header, payload: decoded.payload },
                  null,
                  2
                ),
                "all"
              )
            }
            title="Copy all decoded JSON"
          >
            {copiedAll ? <Check size={14} /> : <Code size={14} />}
            Copy All JSON
          </button>
          <ClearButton
            onClick={() => {
              setToken("");
              setNoticeWithTimeout("Cleared token.");
            }}
            title="Clear token input"
          />
        </div>
      </div>

      {/* Encoded Token Input Section */}
      <div
        className="editor-layout"
        style={{ gridTemplateColumns: "1fr", height: "auto" }}
      >
        <section className="editor-pane">
          <div className="editor-header">
            <span>
              <span className={`pane-dot ${decoded.isValidFormat ? "green" : ""}`} />
              Encoded Token (Paste Header.Payload.Signature)
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={() => uploadRef.current?.click()}
                title="Upload token from file"
              >
                <Upload size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => handleCopy(token, "all")}
                title="Copy raw token"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div className="editor-body" style={{ height: "130px" }}>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your JWT token here (e.g. eyJhbGciOi...)..."
              spellCheck={false}
              aria-label="JWT token string"
            />
          </div>

          {/* Color-coded Token Preview */}
          {decoded.isValidFormat && (
            <div className="jwt-token-display">
              <span className="jwt-part-header" title="Header (Algorithm & Type)">
                {decoded.rawHeader}
              </span>
              <span className="jwt-part-dot">.</span>
              <span className="jwt-part-payload" title="Payload (Claims & Data)">
                {decoded.rawPayload}
              </span>
              <span className="jwt-part-dot">.</span>
              <span className="jwt-part-signature" title="Signature">
                {decoded.rawSignature}
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Error Card */}
      {decoded.error && token.trim() !== "" && (
        <div className="feedback-card error" style={{ marginTop: "16px" }}>
          <div className="error-banner-main">
            <span className="error-icon-chip">
              <AlertCircle size={16} />
            </span>
            <div className="error-banner-text">
              <div className="error-banner-header">
                <strong>Invalid JWT Token</strong>
              </div>
              <p className="error-tip-text">{decoded.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expiry & Validity Status Banner */}
      {decoded.isValidFormat && (
        <div className={`jwt-status-banner ${decoded.isExpired ? "expired" : "valid"}`}>
          <div className="jwt-status-content">
            {decoded.isExpired ? (
              <XCircle size={22} className="error-icon" />
            ) : (
              <CheckCircle2 size={22} className="success-icon" />
            )}
            <div>
              <div className="jwt-status-title">
                <span>{decoded.isExpired ? "Token is Expired" : "Token is Active"}</span>
                <span
                  className="diff-pill"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                >
                  Algorithm: {decoded.algorithm}
                </span>
                <span
                  className="diff-pill"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                >
                  Type: {decoded.tokenType}
                </span>
              </div>
              {decoded.expiresFormatted && (
                <div className="jwt-status-desc">
                  Expiration: {decoded.expiresFormatted} ({decoded.expiresRelative})
                </div>
              )}
            </div>
          </div>

          {decoded.issuedFormatted && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                textAlign: "right",
              }}
            >
              Issued at: {decoded.issuedFormatted}
            </div>
          )}
        </div>
      )}

      {/* Decoded Cards Grid */}
      {decoded.isValidFormat && (
        <div className="jwt-decoded-grid">
          {/* Header Card */}
          <div className="jwt-card">
            <div className="jwt-card-header header-card">
              <span style={{ color: "#ef4444" }}>Header (Algorithm & Type)</span>
              <button
                className="icon-btn"
                onClick={() => handleCopy(decoded.headerJson, "header")}
                title="Copy header JSON"
              >
                {copiedHeader ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="jwt-card-body">
              <pre className="jwt-json-pre">{decoded.headerJson}</pre>
            </div>
          </div>

          {/* Payload Card */}
          <div className="jwt-card">
            <div className="jwt-card-header payload-card">
              <span style={{ color: "#8b5cf6" }}>Payload (Data & Claims)</span>
              <button
                className="icon-btn"
                onClick={() => handleCopy(decoded.payloadJson, "payload")}
                title="Copy payload JSON"
              >
                {copiedPayload ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="jwt-card-body">
              <pre className="jwt-json-pre">{decoded.payloadJson}</pre>

              {/* Claims Explanation Table */}
              <table className="jwt-claims-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Value</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {decoded.claims.map((claim) => (
                    <tr key={claim.key}>
                      <td className="jwt-claim-key">{claim.key}</td>
                      <td className="jwt-claim-val">
                        {claim.isDate ? (
                          <>
                            <div>{String(claim.value)}</div>
                            <small style={{ color: "var(--muted)" }}>
                              {claim.dateString} ({claim.relativeTime})
                            </small>
                          </>
                        ) : typeof claim.value === "object" ? (
                          JSON.stringify(claim.value)
                        ) : (
                          String(claim.value)
                        )}
                      </td>
                      <td className="jwt-claim-desc">{claim.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {notice && (
        <div className="feedback success" style={{ marginTop: "18px" }}>
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Documentation Section */}
      <section className="workspace-docs">
        <div>
          <h2>Understanding JSON Web Tokens</h2>
          <p>
            JSON Web Tokens are an open, industry-standard (RFC 7519) method for
            representing claims securely between two parties. Tokens are divided into
            three parts separated by dots:
          </p>
          <ul
            style={{
              paddingLeft: "20px",
              marginTop: "12px",
              fontSize: "13px",
              lineHeight: "1.8",
              color: "var(--muted)",
            }}
          >
            <li>
              <strong style={{ color: "#ef4444" }}>Header:</strong> Contains token type
              and signing algorithm (e.g. HS256, RS256).
            </li>
            <li>
              <strong style={{ color: "#8b5cf6" }}>Payload:</strong> Contains claims (user
              IDs, roles, expiration timestamps).
            </li>
            <li>
              <strong style={{ color: "#06b6d4" }}>Signature:</strong> Verifies that the
              sender of the JWT is who it says it is and ensures content hasn&apos;t
              changed.
            </li>
          </ul>
        </div>

        <div className="docs-details">
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Client-Side Privacy</strong>
              JWTs often contain sensitive authorization scopes and user IDs. Our decoder
              operates completely inside your browser. No tokens are sent over the
              network.
            </span>
          </p>
          <p>
            <Lock size={18} />
            <span>
              <strong>Base64Url Encoding vs Encryption</strong>
              JWTs are digitally signed and Base64Url encoded, but NOT encrypted by
              default (unless using JWE). Never store unencrypted secrets or passwords in
              the payload.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

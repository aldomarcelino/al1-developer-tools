"use client";

import { useEffect, useRef, useState } from "react";
import { Hash, Copy, LoaderCircle } from "lucide-react";
import {
  hashAlgorithms,
  hashBuffer,
  compareChecksum,
  type HashAlgorithm,
} from "@/features/hash-generator/lib/hash";
import { formatBytes } from "@/lib/format/file-size";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
export function HashWorkspace() {
  const [mode, setMode] = useState("text");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [expected, setExpected] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const job = useRef(0);
  useEffect(
    () => () => {
      job.current++;
    },
    []
  );
  function invalidate() {
    job.current++;
    setHash("");
    setNotice("");
    setBusy(false);
  }
  async function generate() {
    const id = ++job.current;
    setHash("");
    setNotice("");
    setBusy(true);
    try {
      if (!crypto.subtle)
        throw new Error("Your browser needs a secure connection to generate hashes.");
      if (mode === "file" && !file) throw new Error("Choose a file first.");
      const bytes =
        mode === "file" && file
          ? await file.arrayBuffer()
          : new TextEncoder().encode(text).buffer;
      const output = await hashBuffer(bytes, algorithm);
      if (id === job.current) {
        setHash(output);
        setNotice("Hash generated.");
      }
    } catch (error) {
      if (id === job.current)
        setNotice(
          error instanceof Error ? error.message : "Could not read or hash this input."
        );
    } finally {
      if (id === job.current) setBusy(false);
    }
  }
  const comparison = hash ? compareChecksum(hash, expected) : "empty";
  const compareMessage = {
    empty: "Paste a checksum to compare with your result.",
    invalid: `Enter a hexadecimal checksum with ${hash.length} characters.`,
    match: "Checksums match.",
    different: "Checksums do not match.",
  }[comparison];
  return (
    <div className="workspace-page page-width utility-tool">
      <ToolHeader title="Hash & Checksum Generator" icon={<Hash size={24} />} />
      <div className="utility-grid">
        <section className="utility-panel utility-form" aria-label="Hash settings">
          <div className="utility-columns">
            <CustomSelect
              layout="stacked"
              label="Input type"
              value={mode}
              onChange={(value) => {
                invalidate();
                setMode(value);
                setFile(null);
              }}
              options={[
                { value: "text", label: "Text" },
                { value: "file", label: "File" },
              ]}
            />
            <CustomSelect
              layout="stacked"
              label="Algorithm"
              value={algorithm}
              onChange={(value) => {
                invalidate();
                setAlgorithm(value as HashAlgorithm);
              }}
              options={hashAlgorithms.map((value) => ({ value, label: value }))}
            />
          </div>
          {mode === "text" ? (
            <label className="utility-field">
              Text to hash
              <textarea
                value={text}
                maxLength={200000}
                onChange={(e) => {
                  invalidate();
                  setText(e.target.value);
                }}
                placeholder="Enter text, or leave blank to hash an empty string…"
                spellCheck={false}
              />
              <span className="utility-hint">
                UTF-8 encoding ·{" "}
                {new TextEncoder().encode(text).byteLength.toLocaleString()} bytes ·
                Whitespace and line breaks are included.
              </span>
            </label>
          ) : (
            <label className="utility-field">
              Choose file
              <input
                type="file"
                onChange={(e) => {
                  invalidate();
                  const selected = e.target.files?.[0];
                  if (selected && selected.size > 50 * 1024 ** 2) {
                    setFile(null);
                    setNotice("Choose a file no larger than 50 MB.");
                    e.target.value = "";
                    return;
                  }
                  setFile(selected ?? null);
                }}
              />
              <span className="utility-hint">
                {file
                  ? `${file.name} · ${formatBytes(file.size)}`
                  : "Any file type, up to 50 MB. Files stay on your device."}
              </span>
            </label>
          )}
          <button
            className="button primary"
            disabled={busy || (mode === "file" && !file)}
            onClick={generate}
          >
            {busy ? (
              <LoaderCircle size={15} className="counter-spinner" />
            ) : (
              <Hash size={15} />
            )}
            {busy ? "Generating…" : "Generate hash"}
          </button>
        </section>
        <section className="utility-panel utility-form" aria-label="Hash result">
          <label className="utility-field">
            {algorithm} checksum
            <textarea
              readOnly
              value={hash}
              placeholder="Your hexadecimal checksum appears here…"
              spellCheck={false}
            />
          </label>
          <button
            className="button"
            disabled={!hash}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(hash);
                setNotice("Checksum copied.");
              } catch {
                setNotice("Could not copy. Select the checksum and copy it manually.");
              }
            }}
          >
            <Copy size={14} />
            Copy checksum
          </button>
          <label className="utility-field">
            Expected checksum
            <input
              type="text"
              value={expected}
              maxLength={256}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Paste a checksum to verify…"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <p className={`utility-hint checksum-${comparison}`} role="status">
            {hash ? compareMessage : "Generate a hash to compare checksums."}
          </p>
        </section>
      </div>
      <p className="utility-notice" role="status">
        {notice}
      </p>
    </div>
  );
}

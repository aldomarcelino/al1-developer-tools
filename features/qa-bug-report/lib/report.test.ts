import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { samplePackage } from "./sample.ts";
import { body } from "./model.ts";
import { sanitizeSession } from "./redact.ts";
import { curlFor, exportEvidence, fence } from "./report.ts";
import { importEvidence } from "./import.ts";
test("phase 4: POSIX cURL preserves literal Unicode, multiline and shell characters without executing input", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qa-shell-"));
  try {
    writeFileSync(
      path.join(dir, "curl"),
      `#!${process.execPath}\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));`,
      { mode: 0o755 }
    );
    const request = samplePackage().session.requests[1];
    const payload = `Unicode 日本語 café\n' \" \` $(touch '${dir}/executed') $HOME @literal`;
    request.body = body(payload, "text/plain");
    request.headers.push(
      { name: "Content-Length", value: "999" },
      { name: "Connection", value: "x-hop" },
      { name: "x-hop", value: "omit" }
    );
    const safe = sanitizeSession({ ...samplePackage().session, requests: [request] })
      .requests[0];
    const { command, warnings } = curlFor(safe);
    assert.ok(command);
    assert.ok(warnings.some((w) => w.includes("enter your own")));
    const result = spawnSync("/bin/sh", ["-c", command], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    assert.equal(result.status, 0, result.stderr);
    const args = JSON.parse(result.stdout) as string[];
    assert.equal(args[args.indexOf("--data-raw") + 1], payload);
    assert.equal(args[args.indexOf("--request") + 1], "POST");
    assert.equal(args[args.indexOf("--url") + 1], request.url);
    assert.ok(!args.some((s) => s.includes("Content-Length") || s.includes("x-hop:")));
    assert.equal(existsSync(path.join(dir, "executed")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("phase 4: export/import retains selected requests, markers, sourced IDs and redaction", () => {
  const source = samplePackage().session;
  const before = JSON.stringify(source);
  const result = exportEvidence(source);
  const restored = importEvidence(result.json);
  assert.equal(restored.session.requests.length, 1);
  assert.equal(restored.session.requests[0].id, "sample-request-2");
  assert.deepEqual(restored.session.report.requestIds, ["sample-request-2"]);
  assert.equal(restored.session.markers[0].sessionId, source.id);
  assert.ok(result.markdown.includes("server-demo-2"));
  assert.ok(!result.json.includes("DUMMY_SAMPLE_TOKEN"));
  assert.equal(JSON.stringify(source), before);
  assert.match(restored.manifest.reportMarkdown, /POSIX cURL/);
  assert.throws(
    () => exportEvidence({ ...source, report: { ...source.report, title: "" } }),
    /title/
  );
  assert.ok(fence("```\n![x](https://example.test)\n```").startsWith("````text"));
});
test("phase 4: unsupported payloads never claim a faithful cURL", () => {
  const r = samplePackage().session.requests[1];
  for (const status of ["Unavailable", "Truncated", "Unsupported"] as const) {
    r.body = body(undefined, "application/json", status);
    assert.equal(curlFor(r).command, null);
  }
  r.body = body("binary", "multipart/form-data");
  assert.equal(curlFor(r).command, null);
});

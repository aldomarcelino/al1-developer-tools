import assert from "node:assert/strict";

const base = process.argv[2] || "http://127.0.0.1:3110";
async function check(path, headers) {
  const response = await fetch(new URL(path, base), { headers });
  assert.equal(response.status, path === "/audit-missing-page" ? 404 : 200, path);
  const policy = response.headers.get("content-security-policy");
  const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && nonce.length >= 32, `${path}: random nonce`);
  const scripts = policy.split(";").find((part) => part.trim().startsWith("script-src "));
  assert.ok(
    !scripts.includes("unsafe-inline") && !scripts.includes("unsafe-eval"),
    `${path}: strict production scripts`
  );
  assert.ok(policy.includes("script-src-attr 'none'"));
  assert.ok(
    response.headers.get("cache-control")?.includes("no-store"),
    `${path}: do not cache nonce HTML`
  );
  const html = await response.text();
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(tags.length > 0, `${path}: rendered scripts`);
  assert.ok(
    tags.every((tag) => tag.includes(`nonce="${nonce}"`)),
    `${path}: every script uses response nonce`
  );
  return { nonce, html };
}
const first = await check("/");
const second = await check("/", {
  "x-nonce": "attacker",
  "Content-Security-Policy": "script-src 'unsafe-inline'",
});
assert.notEqual(first.nonce, second.nonce, "new nonce for every request");
assert.notEqual(second.nonce, "attacker", "ignore client-supplied nonce");
for (const path of [
  "/tools/qa-bug-report",
  "/tools/json-yaml-converter",
  "/tools/image-to-pdf",
  "/tools/date-calculator",
  "/tools/regex-tester",
  "/tools/notes",
  "/tools/image-compressor",
  "/audit-missing-page",
])
  await check(path);
// Route CSS should not pull unrelated feature selectors into a cold HTML response.
async function css(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /rel="stylesheet"/.test(tag));
  const urls = links.map((tag) => tag.match(/href="([^"]+)"/)?.[1]).filter(Boolean);
  return (
    await Promise.all(urls.map(async (url) => (await fetch(new URL(url, base))).text()))
  ).join("\n");
}
const homeCss = await css(first.html);
const regexCss = await css((await check("/tools/regex-tester")).html);
assert.ok(homeCss.includes(".hero"), "home feature CSS loaded");
assert.ok(!homeCss.includes(".regex-hero-card"), "home excludes Regex CSS");
assert.ok(regexCss.includes(".regex-hero-card"), "Regex CSS loaded");
assert.ok(
  regexCss.includes(".tool-context"),
  "shared related-tool component owns its CSS"
);
assert.ok(regexCss.includes(".ramupod-spark-piece"), "shared logo owns its effects CSS");
assert.ok(
  !regexCss.includes(".compressor-controls-card"),
  "Regex excludes Compressor CSS"
);
console.log(
  "Security checks passed: unique nonces, spoof protection, script coverage, private HTML/404, and route CSS isolation."
);

import assert from "node:assert/strict";

const base = process.argv[2] || "http://127.0.0.1:8787";
const origin = process.argv[3];
const paths = [
  "/",
  "/about",
  ...[
    "json-formatter",
    "markdown-editor",
    "diff-viewer",
    "jwt-decoder",
    "base64-url",
    "regex-tester",
    "timestamp-converter",
    "uuid-generator",
    "json-to-typescript",
    "sql-formatter",
    "curl-to-code",
    "webhook-inspector",
  ].map((slug) => `/tools/${slug}`),
];
const titles = new Set();
const descriptions = new Set();
function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [
      match[1],
      match[2].replaceAll("&amp;", "&").replaceAll("&quot;", '"'),
    ])
  );
}
for (const path of paths) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const tags = [...html.matchAll(/<meta\s[^>]*>/g)].map(([tag]) => attributes(tag));
  const meta = (key) =>
    tags.find((tag) => tag.name === key || tag.property === key)?.content;
  assert.ok(title && !titles.has(title), `${path}: unique title`);
  titles.add(title);
  assert.ok(
    meta("description") && !descriptions.has(meta("description")),
    `${path}: unique description`
  );
  descriptions.add(meta("description"));
  assert.equal(meta("og:description"), meta("description"), `${path}: OG description`);
  assert.equal(meta("twitter:card"), "summary_large_image", `${path}: Twitter card`);
  assert.ok(meta("author")?.includes("Aldo Marcelino NF Lubis"), `${path}: author`);
  const headings = (html.match(/<h1[\s>]/g) || []).length;
  // Markdown's document preview may legitimately contain its own H1.
  if (path.endsWith("markdown-editor")) assert.ok(headings >= 1);
  else assert.equal(headings, 1, `${path}: single primary H1`);
  assert.ok(
    html.includes('href="/about"') && html.includes("Designed &amp; built by"),
    `${path}: visible maker credit`
  );
  const canonical = [...html.matchAll(/<link\s[^>]*>/g)]
    .map(([tag]) => attributes(tag))
    .find((tag) => tag.rel === "canonical")?.href;
  if (origin) {
    assert.equal(
      new URL(canonical).href,
      new URL(path, origin).href,
      `${path}: canonical`
    );
    assert.equal(
      new URL(meta("og:url")).href,
      new URL(canonical).href,
      `${path}: OG URL`
    );
    assert.equal(
      meta("og:image"),
      new URL("/social-preview.jpg", origin).href,
      `${path}: image`
    );
  } else {
    assert.equal(canonical, undefined, `${path}: no invented canonical`);
  }
  const noindex = path.endsWith("webhook-inspector") || !origin;
  assert.ok(
    meta("robots")
      ?.split(/,\s*/)
      .includes(noindex ? "noindex" : "index"),
    `${path}: indexing`
  );
  const data = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ].map(([, json]) => JSON.parse(json));
  if (path === "/about")
    assert.ok(
      data.some(
        (entry) =>
          entry["@type"] === "ProfilePage" &&
          entry.mainEntity.name === "Aldo Marcelino NF Lubis"
      ),
      "maker schema"
    );
  if (origin && path.startsWith("/tools/") && !path.endsWith("webhook-inspector"))
    assert.ok(
      data.some((entry) =>
        entry["@graph"]?.some(
          (node) =>
            node["@type"] === "WebApplication" &&
            node.creator.name === "Aldo Marcelino NF Lubis"
        )
      ),
      `${path}: tool schema`
    );
  console.log(`OK ${path}`);
}
for (const [alias, target] of [
  ["base64", "base64-url"],
  ["random-keygen", "uuid-generator"],
]) {
  const response = await fetch(new URL(`/tools/${alias}`, base), { redirect: "manual" });
  assert.equal(response.status, 308, alias);
  assert.equal(
    new URL(response.headers.get("location"), base).pathname,
    `/tools/${target}`
  );
}
const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
assert.ok(!sitemap.includes("webhook-inspector"), "coming soon excluded from sitemap");
if (origin) {
  assert.equal(
    (sitemap.match(/<loc>/g) || []).length,
    13,
    "homepage, maker, and 11 tools"
  );
  assert.ok(sitemap.includes(new URL("/about", origin).href));
} else assert.equal((sitemap.match(/<loc>/g) || []).length, 0);
const image = await fetch(new URL("/social-preview.jpg", base));
assert.equal(image.status, 200);
assert.ok(image.headers.get("content-type")?.includes("image/jpeg"));
const bytes = new DataView(await image.arrayBuffer());
assert.equal(bytes.getUint16(0), 0xffd8, "JPEG signature");
let dimensions;
for (let offset = 2; offset < bytes.byteLength - 8;) {
  const marker = bytes.getUint8(offset + 1);
  if (marker === 0xc0 || marker === 0xc2) {
    dimensions = [bytes.getUint16(offset + 7), bytes.getUint16(offset + 5)];
    break;
  }
  offset += 2 + bytes.getUint16(offset + 2);
}
assert.deepEqual(dimensions, [1200, 630], "social image dimensions");
console.log("SEO checks passed: 14 pages, 2 redirects, sitemap, and social image.");

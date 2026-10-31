/** Viewer regression checks using synthetic files only and a temporary browser context. */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const { chromium } = await import(
  process.env.QA_PLAYWRIGHT_PATH
    ? pathToFileURL(process.env.QA_PLAYWRIGHT_PATH).href
    : "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  art = path.join(root, "artifacts/qa-viewer-refresh");
await mkdir(art, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [],
    targetRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (/fixture\.example\.test|127\.0\.0\.1:3891/.test(r.url()))
      targetRequests.push(r.url());
  });
  await page.goto(
    (process.env.QA_VIEWER_URL ?? "http://localhost:3000") + "/tools/qa-bug-report"
  );
  await page
    .getByRole("region", { name: "Get started with QA capture", exact: true })
    .waitFor();
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "empty-desktop.png"),
  });
  await page
    .getByText("Capture a new session with the Chrome extension", { exact: true })
    .click();
  await page
    .getByRole("heading", { name: "One install. Ready for your next test.", exact: true })
    .waitFor();
  await page
    .getByText("Capture a new session with the Chrome extension", { exact: true })
    .click();
  await page.getByRole("button", { name: "Try synthetic sample", exact: true }).click();
  await page.getByRole("region", { name: "Capture summary", exact: true }).waitFor();
  assert.equal(await page.locator("#qa-report").getAttribute("open"), null);
  assert.equal(await page.locator("#qa-technical").getAttribute("open"), null);
  await page
    .getByRole("button", { name: "Copy cURL for sample-request-2", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "cURL copied." }).waitFor();
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "sample-desktop.png"),
  });
  // Marked HTTP 200 must remain visible even when the session contains a 500.
  const capture = JSON.parse(
    await readFile(
      path.join(root, "artifacts/qa-quick-capture/quick-capture.ramupod.json"),
      "utf8"
    )
  );
  capture.session.report.requestIds = [
    capture.session.requests.find((r) => r.response.status === 200).id,
  ];
  capture.session.report.title = "Checkout wording and response review";
  capture.session.attachments[0].reviewed = false;
  const upload = async (value, name = "capture.json") =>
    page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name,
        mimeType: "application/json",
        buffer: Buffer.from(typeof value === "string" ? value : JSON.stringify(value)),
      });
  await upload(capture);
  await page
    .getByRole("heading", { name: capture.session.report.title, exact: true })
    .waitFor();
  const marked = capture.session.report.requestIds[0];
  assert.equal(
    await page
      .getByRole("button", { name: `Mark request ${marked}`, exact: true })
      .getAttribute("aria-pressed"),
    "true"
  );
  assert.equal(await page.getByRole("button", { name: /^Mark request / }).count(), 1);
  await page.getByRole("tab", { name: /HTTP errors/ }).click();
  assert.ok((await page.getByRole("button", { name: /^Mark request / }).count()) >= 3);
  await page.getByRole("tab", { name: /^All \(/ }).click();
  await page.getByRole("button", { name: `Mark request ${marked}`, exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: `Mark request ${marked}`, exact: true })
      .getAttribute("aria-pressed"),
    "false"
  );
  await page.getByRole("button", { name: `Mark request ${marked}`, exact: true }).click();
  const open = page.getByRole("button", { name: /^Open screenshot 1:/ });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Screenshot preview", exact: true });
  await dialog.waitFor();
  const centered = await dialog.boundingBox();
  assert.ok(Math.abs(centered.x + centered.width / 2 - 720) < 2);
  assert.ok(
    await dialog.getByRole("button", { name: "Download image", exact: true }).isDisabled()
  );
  await dialog
    .getByRole("checkbox", {
      name: "I reviewed this screenshot for private information",
      exact: true,
    })
    .check();
  assert.ok(await dialog.isVisible());
  assert.ok(
    await dialog.getByRole("button", { name: "Download image", exact: true }).isEnabled()
  );
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "screenshot-preview.png"),
  });
  const imageDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download image", exact: true }).click();
  assert.ok((await imageDownload).suggestedFilename().endsWith(".png"));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.ok(await open.evaluate((el) => el === document.activeElement));
  const result = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download capture", exact: true }).click();
  const downloaded = await result;
  const exported = JSON.parse(await readFile(await downloaded.path(), "utf8"));
  assert.ok(exported.session.report.requestIds.includes(marked));
  assert.equal(exported.session.attachments[0].reviewed, true);
  assert.equal(exported.manifest.requestCount, capture.session.requests.length);
  await page.getByRole("button", { name: "Inspect", exact: true }).first().click();
  assert.notEqual(await page.locator("#qa-technical").getAttribute("open"), null);
  await page.getByText("Inspect technical evidence", { exact: true }).click();
  await page.getByRole("button", { name: "Add a detailed report", exact: true }).click();
  assert.notEqual(await page.locator("#qa-report").getAttribute("open"), null);
  await page.getByText("Write a detailed report", { exact: true }).click();
  await page.getByRole("tab", { name: /^Marked \(/ }).click();
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "capture-desktop.png"),
  });
  await upload("{not json", "broken.json");
  await page.getByRole("alert").waitFor();
  assert.ok(
    await page.getByRole("region", { name: "Capture summary", exact: true }).isVisible()
  );
  await page.getByRole("button", { name: "Clear session", exact: true }).click();
  await page
    .getByRole("region", { name: "Get started with QA capture", exact: true })
    .waitFor();
  await upload(exported);
  await page
    .getByRole("heading", { name: capture.session.report.title, exact: true })
    .waitFor();
  // Long URLs and bodies must stay inside the responsive workspace.
  const long = structuredClone(exported);
  long.session.requests.find((r) => r.id === marked).url += "&long=" + "x".repeat(8000);
  long.session.requests.find((r) => r.id === marked).response.body.text = "x".repeat(
    16000
  );
  await upload(long);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
  );
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "capture-mobile-dark.png"),
  });
  await open.click();
  await dialog.waitFor();
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
  );
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "preview-mobile-dark.png"),
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clear session", exact: true }).click();
  await page
    .getByRole("region", { name: "Get started with QA capture", exact: true })
    .waitFor();
  await page.screenshot({
    caret: "initial",
    animations: "disabled",
    path: path.join(art, "empty-mobile-dark.png"),
  });
  assert.deepEqual(targetRequests, []);
  assert.deepEqual(errors, []);
  console.log(
    "VIEWER_MARKED_EVIDENCE_FILTERS_COPY_EXPORT_REVIEW_DIALOG_DOWNLOAD_FOCUS_MOBILE_DARK_PASSED"
  );
  await context.close();
} finally {
  await browser.close();
}

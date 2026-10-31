/** Real MV3 DevTools integration test. Optional Playwright supplied by QA_PLAYWRIGHT_PATH. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.QA_PLAYWRIGHT_PATH
    ? pathToFileURL(process.env.QA_PLAYWRIGHT_PATH).href
    : "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url));
const artifact = path.join(root, "artifacts/qa-bug-capture");
await mkdir(artifact, { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), "ramupod-qa-e2e-"));
const extension = path.join(root, "dist/qa-capture");
const context = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  headless: false,
  ignoreDefaultArgs: ["--disable-extensions"],
  args: [
    "--auto-open-devtools-for-tabs",
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
let serial = 0;
const client = await context.browser().newBrowserCDPSession();
const callbacks = new Map();
client.on("Target.receivedMessageFromTarget", (event) => {
  const response = JSON.parse(event.message);
  if (response.id) {
    const key = `${event.sessionId}:${response.id}`;
    const entry = callbacks.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      callbacks.delete(key);
      response.error
        ? entry.reject(new Error(response.error.message))
        : entry.resolve(response.result);
    }
  }
});
async function attach(targetId) {
  const { sessionId } = await client.send("Target.attachToTarget", {
    targetId,
    flatten: false,
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++serial;
      const key = `${sessionId}:${id}`;
      const timer = setTimeout(() => {
        callbacks.delete(key);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
      callbacks.set(key, { resolve, reject, timer });
      void client
        .send("Target.sendMessageToTarget", {
          sessionId,
          message: JSON.stringify({ id, method, params }),
        })
        .catch(reject);
    });
}
async function evaluate(call, expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.text +
        " " +
        JSON.stringify(result.exceptionDetails.exception)
    );
  return result.result.value;
}

const targets = async () => (await client.send("Target.getTargets")).targetInfos;
async function waitFor(work, message, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await work();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(message);
}
async function openPanel(page) {
  const existingPanels = new Set(
    (await targets()).filter((t) => t.url.endsWith("/panel.html")).map((t) => t.targetId)
  );
  const pageClient = await context.newCDPSession(page);
  const { targetInfo } = await pageClient.send("Target.getTargetInfo");
  const { targetId } = await client.send("Target.openDevTools", {
    targetId: targetInfo.targetId,
  });
  const front = await attach(targetId);
  const view = await waitFor(async () => {
    try {
      return await evaluate(
        front,
        `(async()=>{const UI=await import('./ui/legacy/legacy.js');const view=[...UI.ViewManager.ViewManager.instance().views.values()].find(view=>view.title()==='Ramupod QA');return view?{id:view.viewId()}:null;})()`
      );
    } catch {
      return null;
    }
  }, "Ramupod QA panel was not registered");
  await evaluate(
    front,
    `(async()=>{const UI=await import('./ui/legacy/legacy.js');await UI.ViewManager.ViewManager.instance().showView(${JSON.stringify(view.id)});return true;})()`
  );
  const panelTarget = await waitFor(
    async () =>
      (await targets()).find(
        (target) =>
          target.url.endsWith("/panel.html") && !existingPanels.has(target.targetId)
      ),
    "Extension panel iframe missing"
  );
  const panelId = panelTarget.targetId;
  const panel = await attach(panelId);
  await waitFor(
    () => evaluate(panel, "Boolean(window.qaCapture)"),
    "Panel API not connected"
  );
  return { front, panel, frontId: targetId };
}

try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("http://127.0.0.1:3891/");
  const { front, panel, frontId } = await openPanel(page);
  await evaluate(
    panel,
    "document.getElementById('environment').value='Local fixture';document.getElementById('build').value='fixture-v1';document.getElementById('start').click();true"
  );
  await waitFor(
    () => evaluate(panel, "document.getElementById('status').textContent==='recording'"),
    "Recording did not start"
  );
  await page
    .getByRole("button", { name: "Run all fixture requests", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Scenario complete" })
    .waitFor({ timeout: 20000 });
  await evaluate(
    panel,
    "document.getElementById('description').value='Checkout error after submitting fixture';document.getElementById('mark').click();document.getElementById('stop').click();true"
  );
  const snapshot = await evaluate(panel, "window.qaCapture.export()");
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: artifact,
    eventsEnabled: true,
  });
  await evaluate(panel, "document.getElementById('export').click();true");
  const capturePath = path.join(artifact, `qa-${snapshot.session.id}.ramupod.json`);
  const captured = await waitFor(async () => {
    try {
      return JSON.parse(await readFile(capturePath, "utf8"));
    } catch {
      return null;
    }
  }, "Extension download did not finish");
  await writeFile(
    path.join(artifact, "real-capture.ramupod.json"),
    JSON.stringify(captured, null, 2)
  );
  console.log("Real capture", {
    state: captured.session.state,
    requests: captured.session.requests.length,
    markers: captured.session.markers.length,
    bodies: captured.session.requests.map((r) => ({
      path: new URL(r.url).pathname,
      status: r.response.status,
      body: r.response.body.status,
    })),
  });
  assert.equal(captured.session.state, "stopped");
  assert.ok(captured.session.requests.length >= 15);
  assert.equal(captured.session.markers.length, 1);
  assert.ok(!JSON.stringify(captured).includes("DUMMY_CAPTURE_SECRET"));
  const post = captured.session.requests.find(
    (r) => new URL(r.url).pathname === "/api/post"
  );
  assert.ok(post);
  assert.equal(post.method, "POST");
  assert.ok(post.body.text.includes("quantity"));
  assert.ok(post.response.body.text.includes("body-post"));
  assert.ok(
    post.response.headers.some(
      (h) => h.name.toLowerCase() === "x-request-id" && h.value === "fixture-post"
    )
  );
  assert.equal(
    captured.session.requests.find((r) => new URL(r.url).pathname === "/api/empty")
      .response.body.status,
    "Empty"
  );
  const screenshot = await front("Page.captureScreenshot", { format: "png" });
  await writeFile(
    path.join(artifact, "extension-capture.png"),
    Buffer.from(screenshot.data, "base64")
  );
  // A stopped session must remain unchanged while additional requests complete.
  await page.getByRole("button", { name: "Send POST checkout", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Checkout request completed" })
    .waitFor();
  assert.equal(
    (await evaluate(panel, "window.qaCapture.snapshot()")).requests.length,
    captured.session.requests.length
  );
  // Independent real sessions/tabs, hidden panel, navigation, DevTools close/recovery.
  await evaluate(panel, "document.getElementById('start').click();true");
  await waitFor(
    () => evaluate(panel, "window.qaCapture.snapshot()?.state==='recording'"),
    "Second session did not start"
  );
  const secondSessionId = await evaluate(panel, "window.qaCapture.snapshot().id");
  assert.notEqual(secondSessionId, captured.session.id);
  assert.equal(await evaluate(panel, "window.qaCapture.snapshot().requests.length"), 0);
  await evaluate(
    front,
    "(async()=>{const UI=await import('./ui/legacy/legacy.js');await UI.ViewManager.ViewManager.instance().showView('network');return true;})()"
  );
  await page.getByRole("button", { name: "Send POST checkout", exact: true }).click();
  await waitFor(
    () => evaluate(panel, "window.qaCapture.snapshot().requests.length===1"),
    "Hidden panel did not keep recording"
  );
  const secondPage = await context.newPage();
  await secondPage.goto("http://127.0.0.1:3891/second");
  const tabTwo = await openPanel(secondPage);
  await evaluate(tabTwo.panel, "document.getElementById('start').click();true");
  await waitFor(
    () => evaluate(tabTwo.panel, "window.qaCapture.snapshot()?.state==='recording'"),
    "Second tab did not start"
  );
  await secondPage
    .getByRole("button", { name: "Send POST checkout", exact: true })
    .click();
  await waitFor(
    () => evaluate(tabTwo.panel, "window.qaCapture.snapshot().requests.length===1"),
    "Second tab did not capture"
  );
  assert.equal(
    await evaluate(panel, "window.qaCapture.snapshot().requests.length"),
    1,
    "Requests crossed tab boundaries"
  );
  assert.notEqual(
    await evaluate(tabTwo.panel, "window.qaCapture.snapshot().tabId"),
    await evaluate(panel, "window.qaCapture.snapshot().tabId")
  );
  await page.getByRole("button", { name: "Send POST checkout", exact: true }).click();
  await waitFor(
    () => evaluate(panel, "window.qaCapture.snapshot().requests.length===2"),
    "First tab second request missing"
  );
  assert.equal(
    await evaluate(tabTwo.panel, "window.qaCapture.snapshot().requests.length"),
    1
  );
  await evaluate(
    tabTwo.panel,
    "document.getElementById('stop').click();document.getElementById('clear').click();true"
  );
  await secondPage.close();
  await page.reload();
  await page.getByRole("link", { name: "Navigate within fixture", exact: true }).click();
  await waitFor(
    () =>
      evaluate(
        panel,
        "window.qaCapture.snapshot().markers.filter(m=>m.source==='navigation').length>=2"
      ),
    "Reload/navigation markers missing"
  );
  assert.equal(await evaluate(panel, "window.qaCapture.snapshot().id"), secondSessionId);
  await page.waitForLoadState("networkidle");
  const beforeClose = await waitFor(
    () =>
      evaluate(
        panel,
        `(async()=>{const current=window.qaCapture.snapshot();const saved=await chrome.storage.local.get('ramupod-qa-tab-'+current.tabId);const snapshot=saved['ramupod-qa-tab-'+current.tabId]?.session;return snapshot?.id===current.id&&snapshot.requests.length===current.requests.length?current:null;})()`
      ),
    "Recovery snapshot was not persisted"
  );
  await client.send("Target.closeTarget", { targetId: frontId });
  await waitFor(
    async () => !(await targets()).some((t) => t.targetId === frontId),
    "DevTools did not close"
  );
  await page.getByRole("button", { name: "Send POST checkout", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Checkout request completed" })
    .waitFor();
  const recovered = await openPanel(page);
  await waitFor(
    () => evaluate(recovered.panel, "window.qaCapture.snapshot()?.state==='stopped'"),
    "Recovered capture resumed or was lost"
  );
  const recovery = await evaluate(recovered.panel, "window.qaCapture.snapshot()");
  assert.equal(recovery.id, secondSessionId);
  assert.equal(recovery.requests.length, beforeClose.requests.length);
  await evaluate(recovered.panel, "document.getElementById('clear').click();true");
  await waitFor(
    () => evaluate(recovered.panel, "window.qaCapture.snapshot()===null"),
    "Clear did not remove in-memory session"
  );
  await waitFor(
    () =>
      evaluate(
        recovered.panel,
        `(async()=>{const saved=await chrome.storage.local.get('ramupod-qa-tab-'+${beforeClose.tabId});return !saved['ramupod-qa-tab-'+${beforeClose.tabId}];})()`
      ),
    "Clear did not delete recovery snapshot"
  );
  console.log("TAB_SESSION_NAVIGATION_RECOVERY_ISOLATION_PASSED");
  // Import the file generated by the extension UI into the actual Ramupod viewer.
  const viewer = await context.newPage();
  const viewerErrors = [];
  viewer.on("console", (message) => {
    if (message.type() === "error") viewerErrors.push(message.text());
  });
  viewer.on("pageerror", (error) => viewerErrors.push(error.message));
  const targetRequests = [];
  viewer.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:3891"))
      targetRequests.push(request.url());
  });
  await viewer.goto(
    (process.env.QA_VIEWER_URL ?? "http://localhost:3000") + "/tools/qa-bug-report"
  );
  await viewer.locator("input[type=file]").first().setInputFiles(capturePath);
  await viewer.getByText(captured.session.id, { exact: true }).waitFor();
  await viewer.getByRole("button", { name: "Bug marker", exact: true }).click();
  await viewer
    .getByRole("option")
    .filter({ hasText: captured.session.markers[0].description })
    .click();
  await viewer
    .getByRole("checkbox", { name: "Include marker in report", exact: true })
    .check();

  await viewer
    .getByRole("checkbox", { name: `Attach ${post.id} to report`, exact: true })
    .check();
  await viewer.getByRole("button").filter({ hasText: post.id }).click();
  await viewer
    .getByRole("button", { name: "Add a detailed report", exact: true })
    .click();
  await viewer
    .getByLabel("Title *", { exact: true })
    .fill("Checkout fixture fails with a business error");
  await viewer
    .getByLabel("Steps to reproduce", { exact: true })
    .fill("1. Start capture.\n2. Run local fixture.\n3. Observe checkout response.");
  await viewer
    .getByLabel("Expected result *", { exact: true })
    .fill("Checkout returns an order confirmation.");
  await viewer
    .getByLabel("Actual result *", { exact: true })
    .fill("Fixture returns an error response.");
  const screenshotBytes = await viewer.screenshot({
    clip: { x: 0, y: 0, width: 300, height: 150 },
  });
  await viewer.locator("input[type=file]").nth(1).setInputFiles({
    name: "qa-fixture.png",
    mimeType: "image/png",
    buffer: screenshotBytes,
  });
  await viewer.getByText("qa-fixture.png", { exact: true }).waitFor();
  await viewer
    .getByRole("checkbox", {
      name: "I reviewed this image for sensitive data",
      exact: true,
    })
    .check();
  await viewer
    .getByRole("checkbox", {
      name: "Include reviewed screenshots in package",
      exact: true,
    })
    .check();
  await viewer.getByRole("button", { name: "Copy Payload", exact: true }).click();
  await viewer.getByRole("status").filter({ hasText: "Payload copied." }).waitFor();
  await viewer.getByRole("tab", { name: "Response", exact: true }).click();
  await viewer.getByRole("button", { name: "Copy Response body", exact: true }).click();
  await viewer.getByRole("status").filter({ hasText: "Response body copied." }).waitFor();
  await viewer.getByRole("button", { name: "Copy POSIX cURL", exact: true }).click();
  await viewer.getByRole("status").filter({ hasText: "POSIX cURL copied." }).waitFor();
  await viewer.getByRole("tab", { name: "Preview", exact: true }).click();
  assert.ok(
    (await viewer.getByRole("region", { name: "Report builder" }).innerText()).includes(
      "fixture-post"
    )
  );
  await rm(capturePath);
  const pendingReport = viewer.waitForEvent("download");
  await viewer
    .getByRole("button", { name: "Export evidence package", exact: true })
    .click();
  await pendingReport;
  const report = await waitFor(async () => {
    try {
      const value = JSON.parse(await readFile(capturePath, "utf8"));
      return value.session.report.title ? value : null;
    } catch {
      return null;
    }
  }, "Report download did not complete");
  const reportPath = path.join(artifact, "completed-report.ramupod.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  assert.equal(report.session.requests.length, 1);
  assert.equal(report.session.attachments.length, 1);
  assert.ok(report.session.attachments[0].reviewed);
  assert.equal(report.session.attachments[0].sessionId, captured.session.id);
  assert.equal(report.session.requests[0].id, post.id);
  assert.equal(report.session.report.sessionId, captured.session.id);
  assert.deepEqual(report.session.report.markerIds, [captured.session.markers[0].id]);
  assert.ok(!JSON.stringify(report).includes("DUMMY_CAPTURE_SECRET"));
  await viewer.getByRole("button", { name: "Clear session", exact: true }).click();
  await viewer.locator("input[type=file]").first().setInputFiles(reportPath);
  await viewer.getByText(captured.session.id, { exact: true }).waitFor();
  assert.equal(
    await viewer.getByLabel("Title *", { exact: true }).inputValue(),
    report.session.report.title
  );
  await viewer.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await viewer.screenshot({
    path: path.join(artifact, "viewer-desktop.png"),
    fullPage: false,
  });
  await viewer
    .getByRole("region", { name: "Request evidence", exact: true })
    .evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await viewer.evaluate(() => window.scrollBy({ top: -90, behavior: "instant" }));
  await viewer.screenshot({
    path: path.join(artifact, "viewer-evidence.png"),
    fullPage: false,
  });
  if ((await viewer.locator("#qa-report").getAttribute("open")) === null)
    await viewer
      .getByRole("button", { name: "Add a detailed report", exact: true })
      .click();
  await viewer
    .getByRole("region", { name: "Report builder", exact: true })
    .evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await viewer.evaluate(() => window.scrollBy({ top: -90, behavior: "instant" }));
  await viewer.screenshot({
    path: path.join(artifact, "report-builder.png"),
    fullPage: false,
  });
  // Keyboard controls and exact incomplete/error handling, without target fetches.
  await viewer.getByRole("textbox", { name: "Search requests", exact: true }).focus();
  await viewer.keyboard.press("Tab");
  assert.ok(
    await viewer
      .getByRole("combobox", { name: "Request filter", exact: true })
      .evaluate((el) => el === document.activeElement)
  );
  await viewer
    .getByRole("combobox", { name: "Request filter", exact: true })
    .press("Enter");
  await viewer.keyboard.press("End");
  await viewer.keyboard.press("Enter");
  await viewer.getByText("No matching requests.", { exact: true }).waitFor();
  await viewer
    .getByRole("combobox", { name: "Request filter", exact: true })
    .press("Enter");
  await viewer.keyboard.press("Home");
  await viewer.keyboard.press("Enter");
  const har = {
    log: {
      version: "1.2",
      entries: [
        {
          startedDateTime: "2026-10-31T00:00:00Z",
          time: 30,
          request: {
            method: "GET",
            url: "http://127.0.0.1:3891/never-fetch-this-report-url",
            headers: [],
          },
          response: {
            status: 500,
            statusText: "Fixture error",
            headers: [],
            content: {
              mimeType: "text/html",
              text: '<script>window.__qaHtmlExecuted=true</script><img src="http://127.0.0.1:3891/never-fetch-this-image">',
            },
          },
          timings: { wait: 30 },
        },
      ],
    },
  };
  await viewer
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "safe-fixture.har",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(har)),
    });
  await viewer
    .getByRole("button")
    .filter({ hasText: "never-fetch-this-report-url" })
    .click();
  await viewer.getByRole("tab", { name: "Response", exact: true }).click();
  await viewer
    .getByRole("heading", { name: "Response body Captured", exact: true })
    .waitFor();
  assert.ok(
    (await viewer.locator("pre").allTextContents()).some((text) =>
      text.includes("<script>window.__qaHtmlExecuted")
    )
  );
  assert.equal(await viewer.evaluate(() => Boolean(window.__qaHtmlExecuted)), false);
  await viewer
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{invalid"),
    });
  await viewer.getByRole("alert").filter({ hasText: "Invalid JSON" }).waitFor();
  // A long URL and unbroken text must not overflow the page on a mobile viewport.
  const long = structuredClone(report);
  long.session.requests[0].url =
    "http://127.0.0.1:3891/never-fetch-long?value=" + "x".repeat(8000);
  long.session.requests[0].query = [{ name: "value", value: "x".repeat(8000) }];
  long.session.requests[0].response.body = {
    status: "Captured",
    text: "x".repeat(16000),
    mimeType: "text/plain",
    encoding: "utf8",
    originalBytes: 16000,
    reason: null,
  };
  await viewer
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "long.ramupod.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(long)),
    });
  await viewer.getByText(long.session.id, { exact: true }).waitFor();
  await viewer.setViewportSize({ width: 390, height: 844 });
  if (
    await viewer.getByRole("button", { name: "Switch to dark mode", exact: true }).count()
  )
    await viewer
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
  assert.equal(
    await viewer.evaluate(() => document.documentElement.dataset.theme),
    "dark"
  );
  assert.ok(
    await viewer.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    ),
    "Mobile content overflowed page"
  );
  await viewer.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await viewer.screenshot({
    path: path.join(artifact, "viewer-mobile-dark.png"),
    fullPage: false,
  });
  await viewer
    .getByRole("region", { name: "Request evidence", exact: true })
    .scrollIntoViewIfNeeded();
  assert.ok(
    await viewer.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    ),
    "Long evidence overflowed page"
  );
  await viewer.getByRole("button", { name: "Clear session", exact: true }).click();
  await viewer
    .getByRole("region", { name: "Get started with QA capture", exact: true })
    .waitFor();
  await viewer.getByRole("button", { name: "Try synthetic sample", exact: true }).click();
  await viewer.getByText("Inspect technical evidence", { exact: true }).click();
  await viewer.getByText("sample-checkout-01", { exact: true }).waitFor();
  assert.ok(
    (await viewer.locator("body").innerText()).includes(
      "Synthetic evidence, not a real incident."
    )
  );
  await viewer
    .getByRole("region", { name: "Request evidence", exact: true })
    .evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await viewer.evaluate(() => window.scrollBy({ top: -80, behavior: "instant" }));
  await viewer.screenshot({
    path: path.join(artifact, "viewer-mobile-evidence.png"),
    fullPage: false,
  });
  console.log("VIEWER_HAR_HTML_ERROR_KEYBOARD_MOBILE_DARK_PASSED");
  assert.deepEqual(viewerErrors, []);
  assert.deepEqual(
    targetRequests,
    [],
    "Opening and copying evidence must not request the target fixture"
  );
  console.log("CAPTURE_TO_REPORT_ROUND_TRIP_PASSED");
  console.log("CORE_EXTENSION_CAPTURE_PASSED");
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}

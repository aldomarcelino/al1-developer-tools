/** Real extension 0.3 UI flow in a dedicated temporary Chrome profile. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.QA_PLAYWRIGHT_PATH
    ? pathToFileURL(process.env.QA_PLAYWRIGHT_PATH).href
    : "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  art = path.join(root, "artifacts/qa-extension-ui");
await mkdir(art, { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), "ramupod-ui-e2e-"));
let context;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    timeout: 30000,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--enable-unsafe-extension-debugging",
      `--disable-extensions-except=${path.join(root, "dist/qa-capture")}`,
      `--load-extension=${path.join(root, "dist/qa-capture")}`,
    ],
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  const worker =
    context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  const browser = await context.browser().newBrowserCDPSession();
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("http://127.0.0.1:3891/");
  const cdp = await context.newCDPSession(page);
  let serial = 0;
  const pending = new Map();
  browser.on("Target.receivedMessageFromTarget", (event) => {
    const m = JSON.parse(event.message),
      key = `${event.sessionId}:${m.id}`,
      job = pending.get(key);
    if (job) {
      pending.delete(key);
      clearTimeout(job.timer);
      m.error ? job.reject(new Error(m.error.message)) : job.resolve(m.result);
    }
  });
  function targetSend(sessionId, method, params = {}) {
    const id = ++serial;
    return new Promise((resolve, reject) => {
      const key = `${sessionId}:${id}`,
        timer = setTimeout(() => {
          pending.delete(key);
          reject(new Error(`Timed out: ${method}`));
        }, 6000);
      pending.set(key, { resolve, reject, timer });
      void browser
        .send("Target.sendMessageToTarget", {
          sessionId,
          message: JSON.stringify({ id, method, params }),
        })
        .catch(reject);
    });
  }
  async function popup(targetPage) {
    await targetPage.bringToFront();
    const { targetInfos } = await browser.send("Target.getTargets", {
      filter: [{ type: "tab", exclude: false }],
    });
    const tab = targetInfos.find((t) => t.url === targetPage.url());
    assert.ok(tab);
    await browser.send("Extensions.triggerAction", {
      id: extensionId,
      targetId: tab.targetId,
    });
    let popup;
    for (let i = 0; i < 30 && !popup; i++) {
      const { targetInfos } = await browser.send("Target.getTargets", { filter: [{}] });
      popup = targetInfos.find((t) => t.type === "page" && t.url.endsWith("/popup.html"));
      if (!popup) await sleep(100);
    }
    assert.ok(popup);
    const { sessionId } = await browser.send("Target.attachToTarget", {
      targetId: popup.targetId,
      flatten: false,
    });
    for (let attempt = 0; attempt < 40; attempt++) {
      const state = await targetSend(sessionId, "Runtime.evaluate", {
        expression: 'Boolean(document.getElementById("test-icon")?.childElementCount)',
        returnByValue: true,
      });
      if (state.result?.value) break;
      if (attempt === 39)
        throw new Error("Popup did not finish loading its activity state");
      await sleep(75);
    }
    return {
      evaluate: async (expression) => {
        const r = await targetSend(sessionId, "Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
          userGesture: true,
        });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result?.value;
      },
      hover: async (id) => {
        const r = await targetSend(sessionId, "Runtime.evaluate", {
          expression: `document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().toJSON()`,
          returnByValue: true,
        });
        const rect = r.result.value;
        await targetSend(sessionId, "Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        });
      },
      screenshot: async (name) => {
        const r = await targetSend(sessionId, "Page.captureScreenshot", {
          format: "png",
        });
        await writeFile(path.join(art, name), Buffer.from(r.data, "base64"));
      },
      close: () =>
        targetSend(sessionId, "Runtime.evaluate", { expression: "window.close()" }).catch(
          () => {}
        ),
    };
  }
  async function ax(name, role = "button") {
    for (let attempt = 0; attempt < 40; attempt++) {
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      const n = nodes.find((n) => n.role?.value === role && n.name?.value === name);
      if (n?.backendDOMNodeId) return n;
      await sleep(75);
    }
    throw new Error(`Missing ${role}: ${name}`);
  }
  async function boxFor(name, role = "button") {
    const n = await ax(name, role);
    const { model } = await cdp.send("DOM.getBoxModel", {
      backendNodeId: n.backendDOMNodeId,
    });
    const q = model.border;
    return { x: q[0], y: q[1], width: q[4] - q[0], height: q[5] - q[1] };
  }
  async function click(name, role = "button") {
    const r = await boxFor(name, role);
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  }
  async function nodeCall(name, role, fn) {
    const n = await ax(name, role);
    const { object } = await cdp.send("DOM.resolveNode", {
      backendNodeId: n.backendDOMNodeId,
    });
    return cdp.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: fn,
      returnByValue: true,
    });
  }
  const stored = () =>
    worker.evaluate(async () => {
      const r = await chrome.storage.local.get("ramupod-quick-capture");
      return r["ramupod-quick-capture"];
    });
  let pop = await popup(page);
  assert.equal(
    await pop.evaluate("getComputedStyle(document.documentElement).colorScheme"),
    "light"
  );
  assert.equal(
    await pop.evaluate('document.getElementById("shot-label").textContent'),
    "Capture screenshot"
  );
  await pop.screenshot("popup-idle.png");
  await pop.evaluate('document.getElementById("screenshot").click()');
  await page.locator("#ramupod-screenshot-selection").waitFor();
  assert.equal(await stored(), undefined);
  pop = await popup(page);
  assert.equal(
    await pop.evaluate('document.getElementById("shot-label").textContent'),
    "Exit Screenshot Mode"
  );
  assert.equal(
    await pop.evaluate('getComputedStyle(document.getElementById("shot-icon")).color'),
    "rgb(180, 35, 24)"
  );
  await pop.screenshot("popup-screenshot-active.png");
  await pop.close();
  const other = await context.newPage();
  await other.goto("http://127.0.0.1:3891/second");
  pop = await popup(other);
  assert.equal(await pop.evaluate('document.getElementById("elsewhere").hidden'), false);
  assert.equal(await pop.evaluate('document.getElementById("modes").hidden'), true);
  await pop.screenshot("popup-other-tab.png");
  await pop.evaluate('document.getElementById("back").click()');
  await sleep(200);
  const owner = await worker.evaluate(async () => {
    const r = await chrome.storage.session.get("ramupod-screenshot-mode");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return { mode: r["ramupod-screenshot-mode"], tabId: tab.id };
  });
  assert.equal(owner.mode.tabId, owner.tabId);
  await other.close();
  await page.mouse.move(120, 170);
  await page.mouse.down();
  await page.mouse.move(880, 550, { steps: 12 });
  await page.screenshot({ path: path.join(art, "screenshot-selection.png") });
  await page.mouse.up();
  await page.locator("#ramupod-image-editor").waitFor();
  const canvasName = "Screenshot canvas. Drag to draw. Text tool: click to add text.";
  await sleep(300);
  let canvas = await boxFor(canvasName, "Canvas");
  await page.mouse.move(canvas.x + 70, canvas.y + 60);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 240, canvas.y + 160, { steps: 8 });
  await page.mouse.up();
  await click("Undo");
  assert.notEqual(
    (await ax("Redo")).properties.find((p) => p.name === "disabled")?.value?.value,
    true
  );
  await click("Redo");
  await nodeCall(
    "Annotation color",
    "ColorWell",
    'function(){this.value="#245ce8";this.dispatchEvent(new Event("input",{bubbles:true}));}'
  );
  await click("Rectangle");
  await page.mouse.move(canvas.x + 290, canvas.y + 60);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 420, canvas.y + 160, { steps: 8 });
  await page.mouse.up();
  await click("Draw");
  await page.mouse.move(canvas.x + 450, canvas.y + 60);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 550, canvas.y + 140, { steps: 8 });
  await page.mouse.up();
  await click("Text");
  await page.mouse.click(canvas.x + canvas.width - 5, canvas.y + canvas.height - 5);
  const edgeInput = await boxFor("Annotation text", "textbox"),
    edgeSave = await boxFor("Add text");
  assert.ok(edgeInput.x >= canvas.x - 1 && edgeInput.y >= canvas.y - 1);
  assert.ok(edgeSave.x + edgeSave.width <= canvas.x + canvas.width + 1);
  assert.ok(edgeInput.y + edgeInput.height <= canvas.y + canvas.height + 1);
  await page.mouse.click(canvas.x + 100, canvas.y + 220);
  const positionedInput = await boxFor("Annotation text", "textbox");
  assert.ok(
    Math.abs(positionedInput.x - (canvas.x + 106)) < 2,
    "Text input must follow clicked X"
  );
  assert.ok(
    Math.abs(positionedInput.y - (canvas.y + 226)) < 2,
    "Text input must follow clicked Y"
  );
  await page.screenshot({ path: path.join(art, "text-input-position.png") });
  await nodeCall("Annotation text", "textbox", "function(){this.focus();}");
  await page.keyboard.insertText("Fix this wording");
  await click("Add text");
  const beforeBlur = (
    await nodeCall(canvasName, "Canvas", "function(){return this.toDataURL();}")
  ).result.value;
  await click("Blur");
  await page.mouse.move(canvas.x + 80, canvas.y + 10);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 260, canvas.y + 65, { steps: 8 });
  await page.mouse.up();
  const blurred = (
    await nodeCall(canvasName, "Canvas", "function(){return this.toDataURL();}")
  ).result.value;
  assert.notEqual(blurred, beforeBlur);
  await click("Undo");
  assert.equal(
    (await nodeCall(canvasName, "Canvas", "function(){return this.toDataURL();}")).result
      .value,
    beforeBlur
  );
  await click("Redo");
  assert.equal(
    (await nodeCall(canvasName, "Canvas", "function(){return this.toDataURL();}")).result
      .value,
    blurred
  );
  await page.screenshot({ path: path.join(art, "screenshot-editor.png") });
  const download = page.waitForEvent("download");
  await click("Download screenshot");
  await (await download).saveAs(path.join(art, "annotated-area.png"));
  const png = await readFile(path.join(art, "annotated-area.png"));
  assert.equal(png.readUInt32BE(16), 760);
  assert.equal(png.readUInt32BE(20), 380);
  await page.locator("#ramupod-image-editor").waitFor({ state: "detached" });
  await sleep(200);
  // Click without dragging captures full viewport; exiting from popup closes editor.
  pop = await popup(page);
  assert.equal(
    await pop.evaluate('document.getElementById("shot-label").textContent'),
    "Capture screenshot"
  );
  await pop.evaluate('document.getElementById("screenshot").click()');
  await page.locator("#ramupod-screenshot-selection").waitFor();
  await page.mouse.click(400, 300);
  await page.locator("#ramupod-image-editor").waitFor();
  pop = await popup(page);
  await pop.evaluate('document.getElementById("screenshot").click()');
  await page.locator("#ramupod-image-editor").waitFor({ state: "detached" });
  console.log(
    "SCREENSHOT_POPUP_SELECTION_EDITOR_HISTORY_COLOR_TEXT_BLUR_DOWNLOAD_EXIT_PASSED"
  );
  pop = await popup(page);
  await pop.evaluate(
    'document.getElementById("viewer").value="http://localhost:3000";document.getElementById("start").click()'
  );
  await page.locator("#ramupod-qa-controls").waitFor();
  pop = await popup(page);
  assert.equal(
    await pop.evaluate('document.getElementById("finish").textContent'),
    "Finish"
  );
  assert.equal(
    await pop.evaluate(
      'document.getElementById("finish").offsetHeight===document.getElementById("cancel").offsetHeight'
    ),
    true
  );
  await pop.hover("cancel");
  assert.equal(
    await pop.evaluate('getComputedStyle(document.getElementById("cancel")).color'),
    "rgb(180, 35, 24)"
  );
  await pop.screenshot("popup-testing-actions.png");
  await pop.close();
  const dockNodes = (await cdp.send("Accessibility.getFullAXTree")).nodes;
  assert.ok(
    !dockNodes.some(
      (n) => n.name?.value === "Mark bug" || n.name?.value === "Minimize controls"
    )
  );
  let initial = await page.locator("#ramupod-qa-controls").boundingBox();
  assert.ok(Math.abs(initial.x + initial.width / 2 - 640) < 1);
  const noGrip = (await cdp.send("Accessibility.getFullAXTree")).nodes;
  assert.ok(!noGrip.some((n) => n.name?.value === "Move controls"));
  await page.mouse.move(initial.x + 35, initial.y + initial.height / 2);
  await page.mouse.down();
  await page.mouse.move(initial.x + 115, initial.y + initial.height / 2 - 55, {
    steps: 8,
  });
  await page.mouse.up();
  const moved = await page.locator("#ramupod-qa-controls").boundingBox();
  assert.ok(Math.abs(moved.x - initial.x - 80) < 1);
  assert.ok(Math.abs(moved.y - initial.y + 55) < 1);
  await page.mouse.move(moved.x + 35, moved.y + moved.height / 2);
  await page.mouse.down();
  await page.mouse.move(moved.x - 45, moved.y + moved.height / 2 + 55, { steps: 8 });
  await page.mouse.up();
  initial = await page.locator("#ramupod-qa-controls").boundingBox();

  await page
    .getByRole("button", { name: "Run all fixture requests", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.getElementById("state").textContent.includes("Scenario complete")
  );
  await sleep(500);
  assert.equal((await stored()).session.requests.length, 17);
  assert.ok(!JSON.stringify(await stored()).includes("DUMMY_CAPTURE_SECRET"));
  const otherLive = await context.newPage();
  await otherLive.goto("http://127.0.0.1:3891/second");
  await otherLive.evaluate(() => fetch("/api/no-identifiers?other-tab-only=yes"));
  await sleep(200);
  assert.equal((await stored()).session.requests.length, 17);
  await otherLive.close();
  await page.bringToFront();
  await click("Captured requests");
  assert.deepEqual(await page.locator("#ramupod-qa-controls").boundingBox(), initial);
  const closeTip = await nodeCall(
    "Close panel",
    "button",
    "function(){return this.hasAttribute('data-tip');}"
  );
  assert.equal(closeTip.result.value, false);
  await click("Mark this request");
  await sleep(200);
  assert.equal(
    (
      await nodeCall(
        "Mark this request",
        "button",
        "function(){return this.getAttribute('aria-pressed');}"
      )
    ).result.value,
    "true"
  );
  assert.equal(
    (
      await nodeCall(
        "Mark this request",
        "button",
        'function(){return getComputedStyle(this.querySelector("svg")).fill;} '
      )
    ).result.value,
    "rgb(16, 62, 59)"
  );
  assert.equal((await stored()).session.report.requestIds.length, 1);
  await click("Mark this request");
  await sleep(200);
  assert.equal(
    (
      await nodeCall(
        "Mark this request",
        "button",
        "function(){return this.getAttribute('aria-pressed');}"
      )
    ).result.value,
    "false"
  );
  await click("Mark this request");
  await sleep(200);
  await click("Copy cURL");
  assert.deepEqual(await page.locator("#ramupod-qa-controls").boundingBox(), initial);
  await page.screenshot({ path: path.join(art, "testing-network.png") });
  await click("Close panel");
  const cancelBox = await boxFor("Cancel testing");
  await page.mouse.move(
    cancelBox.x + cancelBox.width / 2,
    cancelBox.y + cancelBox.height / 2
  );
  assert.equal(
    (
      await nodeCall(
        "Cancel testing",
        "button",
        "function(){return getComputedStyle(this).color;}"
      )
    ).result.value,
    "rgb(180, 35, 24)"
  );
  await click("Cancel testing");
  assert.equal(
    (
      await nodeCall(
        "Close panel",
        "button",
        "function(){return this.hasAttribute('data-tip');}"
      )
    ).result.value,
    false
  );
  assert.equal(
    (
      await nodeCall(
        "Discard session",
        "button",
        "function(){return getComputedStyle(this).backgroundColor;}"
      )
    ).result.value,
    "rgb(180, 35, 24)"
  );
  assert.equal(
    (
      await nodeCall(
        "Discard session",
        "button",
        "function(){return getComputedStyle(this).color;}"
      )
    ).result.value,
    "rgb(255, 255, 255)"
  );
  await page.screenshot({ path: path.join(art, "cancel-testing-destructive.png") });
  await click("Close panel");
  await click("Pause testing");
  await sleep(200);
  const paused = await stored();
  assert.equal(paused.session.state, "paused");
  const count = paused.session.requests.length;
  await page.evaluate(() => fetch("/api/no-identifiers?during-pause=yes"));
  await sleep(300);
  assert.equal((await stored()).session.requests.length, count);
  const second = await context.newPage();
  await second.goto("http://127.0.0.1:3891/second");
  pop = await popup(second);
  assert.equal(await pop.evaluate('document.getElementById("elsewhere").hidden'), false);
  await pop.close();
  await second.close();
  await page.bringToFront();
  await page.screenshot({ path: path.join(art, "testing-paused.png") });
  await click("Resume testing");
  await sleep(200);
  await page.evaluate(() => fetch("/api/no-identifiers?after-resume=yes"));
  await sleep(400);
  assert.equal((await stored()).session.id, paused.session.id);
  assert.equal((await stored()).session.requests.length, count + 1);
  await click("Capture screenshot");
  await page.locator("#ramupod-screenshot-selection").waitFor();
  await page.mouse.click(400, 300);
  await page.locator("#ramupod-image-editor").waitFor();
  await sleep(200);
  await click("Save screenshot to session");
  await page.locator("#ramupod-image-editor").waitFor({ state: "detached" });
  await sleep(300);
  assert.equal((await stored()).session.attachments.length, 1);
  await page.screenshot({ path: path.join(art, "testing-dock.png") });
  const opened = context.waitForEvent("page", {
    predicate: (p) => p.url().includes("/tools/qa-bug-report"),
  });
  await click("Finish");
  const viewer = await opened;
  const viewerErrors = [],
    targetRequests = [];
  viewer.on("pageerror", (e) => viewerErrors.push(e.message));
  viewer.on("console", (e) => {
    if (e.type() === "error") viewerErrors.push(e.text());
  });
  viewer.on("request", (r) => {
    if (r.url().startsWith("http://127.0.0.1:3891")) targetRequests.push(r.url());
  });
  await page.locator("#ramupod-qa-controls").waitFor({ state: "detached" });
  await viewer.getByRole("region", { name: "Capture summary", exact: true }).waitFor();
  assert.equal((await stored()).session.report.requestIds.length, 1);
  assert.equal(await viewer.locator('img[alt^="Captured evidence:"]').count(), 1);
  await viewer.screenshot({ path: path.join(art, "handoff-summary.png") });
  pop = await popup(page);
  await pop.evaluate('document.getElementById("start").click()');
  await page.locator("#ramupod-qa-controls").waitFor();
  const fresh = await stored();
  assert.notEqual(fresh.session.id, paused.session.id);
  assert.equal(fresh.session.attachments.length, 0);
  await click("Capture screenshot");
  await page.locator("#ramupod-screenshot-selection").waitFor();
  await page.mouse.click(300, 250);
  await page.locator("#ramupod-image-editor").waitFor();
  pop = await popup(page);
  await pop.evaluate('document.getElementById("cancel").click()');
  await pop.close();
  await page.locator("#ramupod-qa-controls").waitFor({ state: "detached" });
  await page.locator("#ramupod-image-editor").waitFor({ state: "detached" });
  assert.equal(await stored(), undefined);
  assert.deepEqual(viewerErrors, []);
  assert.deepEqual(targetRequests, []);
  console.log(
    "TESTING_CENTERED_ANCHORED_PANELS_PAUSE_RESUME_LOCK_SCREENSHOT_FINISH_HANDOFF_PASSED"
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}

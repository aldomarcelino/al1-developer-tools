import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "./format-time.ts";
import { formatBytes } from "./format-bytes.ts";
import { generateFilename } from "./media-support.ts";
import { calculateOverlayBox } from "./canvas-compositor.ts";
import { mixAudioTracks } from "./audio-mixer.ts";
import { tools, matchesToolQuery } from "../../../config/tools.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("formatDuration formats seconds, minutes, and hours properly", () => {
  assert.equal(formatDuration(0), "00:00:00");
  assert.equal(formatDuration(-1000), "00:00:00");
  assert.equal(formatDuration(NaN), "00:00:00");
  assert.equal(formatDuration(7000), "00:00:07");
  assert.equal(formatDuration(65000), "00:01:05");
  assert.equal(formatDuration(600000), "00:10:00");
  assert.equal(formatDuration(3665000), "01:01:05");
  assert.equal(formatDuration(86400000), "24:00:00");
});

test("formatBytes produces readable units from bytes to GB", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-100), "0 B");
  assert.equal(formatBytes(NaN), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1048576), "1 MB");
  assert.equal(formatBytes(15728640), "15 MB");
  assert.equal(formatBytes(1073741824), "1 GB");
});

test("generateFilename creates standardized filenames with timestamps and correct extensions", () => {
  const fixedDate = new Date("2026-10-31T13:45:00Z");
  const webmName = generateFilename("webm", fixedDate);
  assert.ok(webmName.startsWith("ramupod-screen-recording-"));
  assert.ok(webmName.endsWith(".webm"));

  const mp4Name = generateFilename(".mp4", fixedDate);
  assert.ok(mp4Name.endsWith(".mp4"));
  assert.ok(!mp4Name.includes("..mp4"));
});

test("calculateOverlayBox accurately computes bounds and corners", () => {
  const canvasW = 1920;
  const canvasH = 1080;
  const webcamAspect = 16 / 9;

  // Medium bottom-right circle
  const brCircle = calculateOverlayBox(
    canvasW,
    canvasH,
    webcamAspect,
    "bottom-right",
    "medium",
    "circle"
  );
  assert.equal(brCircle.width, Math.round(canvasW * 0.2));
  assert.equal(brCircle.height, brCircle.width);
  assert.equal(brCircle.radius, brCircle.width / 2);
  assert.ok(brCircle.x > canvasW / 2);
  assert.ok(brCircle.y > canvasH / 2);

  // Small bottom-left rounded
  const blRounded = calculateOverlayBox(
    canvasW,
    canvasH,
    webcamAspect,
    "bottom-left",
    "small",
    "rounded"
  );
  assert.equal(blRounded.width, Math.round(canvasW * 0.15));
  assert.ok(blRounded.height < blRounded.width); // 16:9 aspect ratio
  assert.ok(blRounded.x < canvasW / 2);
  assert.ok(blRounded.y > canvasH / 2);

  // Large top-right circle
  const trCircle = calculateOverlayBox(
    canvasW,
    canvasH,
    webcamAspect,
    "top-right",
    "large",
    "circle"
  );
  assert.equal(trCircle.width, Math.round(canvasW * 0.25));
  assert.ok(trCircle.x > canvasW / 2);
  assert.ok(trCircle.y < canvasH / 2);

  // Top-left corner
  const tl = calculateOverlayBox(
    canvasW,
    canvasH,
    webcamAspect,
    "top-left",
    "medium",
    "rounded"
  );
  assert.ok(tl.x < canvasW / 2);
  assert.ok(tl.y < canvasH / 2);
});

test("mixAudioTracks handles null and single-track cases gracefully", () => {
  assert.equal(mixAudioTracks(null, null), null);

  let stopped = false;
  const fakeTrack = {
    stop: () => {
      stopped = true;
    },
  } as unknown as MediaStreamTrack;

  const resultSingle = mixAudioTracks(fakeTrack, null);
  assert.ok(resultSingle);
  assert.equal(resultSingle.track, fakeTrack);
  resultSingle.cleanup();
  assert.equal(stopped, true);
});

test("screen-recorder is registered in tools list and matches search queries", () => {
  const tool = tools.find((t) => t.slug === "screen-recorder");
  assert.ok(tool, "screen-recorder must exist in tools registry");
  assert.equal(tool.status, "available");
  assert.equal(tool.icon, "video");
  assert.equal(tool.category, "Utilities");

  // Search queries
  assert.ok(matchesToolQuery(tool, "screen recorder"));
  assert.ok(matchesToolQuery(tool, "record screen"));
  assert.ok(matchesToolQuery(tool, "rekam layar"));
  assert.ok(matchesToolQuery(tool, "webcam overlay"));

  // SEO metadata exists
  assert.ok(toolSeo["screen-recorder"]);
  assert.ok(toolSeo["screen-recorder"].title.includes("Screen Recorder"));
  assert.ok(toolSeo["screen-recorder"].description.length > 20);
  assert.ok(toolSeo["screen-recorder"].note.length > 20);
});

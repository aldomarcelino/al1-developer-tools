import test from "node:test";
import assert from "node:assert/strict";
import { paginateDocument } from "./md-to-pdf-layout.ts";

test("keeps short documents at their natural height without stretching", () => {
  assert.deepEqual(paginateDocument(150, 800), [{ start: 0, end: 150 }]);
});

test("moves a text line or table row intact onto the next page", () => {
  assert.deepEqual(paginateDocument(1600, 800, [{ top: 780, bottom: 820 }]), [
    { start: 0, end: 780 },
    { start: 780, end: 1580 },
    { start: 1580, end: 1600 },
  ]);
});

test("handles overlapping line and block spans without cutting either", () => {
  const pages = paginateDocument(1200, 800, [
    { top: 750, bottom: 850 },
    { top: 700, bottom: 770 },
  ]);
  assert.deepEqual(pages, [
    { start: 0, end: 700 },
    { start: 700, end: 1200 },
  ]);
});

test("oversized blocks can continue without an infinite pagination loop", () => {
  const pages = paginateDocument(2400, 800, [{ top: 0, bottom: 2400 }]);
  assert.deepEqual(pages, [
    { start: 0, end: 800 },
    { start: 800, end: 1600 },
    { start: 1600, end: 2400 },
  ]);
});

test("fractional dimensions preserve every part of the document with no gaps", () => {
  const pages = paginateDocument(2217.75, 713.2, [{ top: 701.25, bottom: 725.5 }]);
  assert.equal(pages[0].start, 0);
  assert.equal(pages.at(-1)?.end, 2217.75);
  pages.forEach((page, i) => {
    assert.ok(page.end > page.start && page.end - page.start <= 713.2 + 0.001);
    if (i) assert.equal(pages[i - 1].end, page.start);
  });
});

test("rejects invalid page geometry rather than hanging", () => {
  for (const height of [0, -1, Infinity, NaN])
    assert.throws(() => paginateDocument(100, height));
});

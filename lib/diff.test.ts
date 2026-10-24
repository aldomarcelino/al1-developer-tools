import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDiffStats,
  computeSideBySideDiff,
  computeUnifiedDiff,
  normalizeJsonString,
} from "./diff.ts";

test("computes unified diff for additions and deletions", () => {
  const orig = "line 1\nline 2\nline 3";
  const mod = "line 1\nline 2 edited\nline 3\nline 4";

  const diff = computeUnifiedDiff(orig, mod);
  const stats = calculateDiffStats(diff);

  assert.equal(stats.unchanged, 2); // line 1, line 3
  assert.equal(stats.deletions, 1); // line 2
  assert.equal(stats.additions, 2); // line 2 edited, line 4
  assert.equal(stats.totalChanges, 3);
});

test("supports ignore whitespace and case options", () => {
  const orig = "HELLO world";
  const mod = "hello   world";

  // Without options -> different
  const diffStrict = computeUnifiedDiff(orig, mod);
  assert.equal(calculateDiffStats(diffStrict).totalChanges, 2);

  // With ignore options -> identical
  const diffRelaxed = computeUnifiedDiff(orig, mod, {
    ignoreCase: true,
    ignoreWhitespace: true,
  });
  assert.equal(calculateDiffStats(diffRelaxed).totalChanges, 0);
  assert.equal(diffRelaxed[0].type, "unchanged");
});

test("normalizes JSON keys for semantic comparison", () => {
  const j1 = '{"b": 2, "a": 1}';
  const j2 = '{"a": 1, "b": 2}';

  const normalized1 = normalizeJsonString(j1);
  const normalized2 = normalizeJsonString(j2);
  assert.equal(normalized1, normalized2);

  const diff = computeUnifiedDiff(j1, j2, { normalizeJson: true });
  assert.equal(calculateDiffStats(diff).totalChanges, 0);
});

test("computes side-by-side diff rows correctly", () => {
  const orig = "A\nB\nC";
  const mod = "A\nB-mod\nC";

  const rows = computeSideBySideDiff(orig, mod);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].original?.type, "unchanged");
  assert.equal(rows[0].modified?.type, "unchanged");

  assert.equal(rows[1].original?.type, "removed");
  assert.equal(rows[1].original?.text, "B");
  assert.equal(rows[1].modified?.type, "added");
  assert.equal(rows[1].modified?.text, "B-mod");

  assert.equal(rows[2].original?.type, "unchanged");
  assert.equal(rows[2].modified?.type, "unchanged");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  identifiers,
  parseTraceparent,
  candidateReasons,
  defaultCandidateRules,
  aroundMarker,
} from "./correlation.ts";
import { samplePackage } from "./sample.ts";
import { body } from "./model.ts";
test("phase 3: sourced identifiers distinguish internal IDs and parse only valid traceparent v00", () => {
  const s = samplePackage().session;
  const ids = identifiers(s.requests[1]);
  assert.ok(
    ids.some(
      (id) => id.kind === "server request ID" && id.source.includes("Response headers")
    )
  );
  assert.ok(
    ids.some(
      (id) => id.value === "trace-checkout-demo" && id.source.includes("JSON body")
    )
  );
  assert.ok(ids.some((id) => id.kind === "span ID" && id.source.includes("upstream")));
  for (const invalid of [
    "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
    "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
    "ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "garbage",
  ])
    assert.equal(parseTraceparent(invalid), null);
  const r = structuredClone(s.requests[0]);
  r.headers = [];
  r.response.headers = [{ name: "traceparent", value: "invalid" }];
  r.response.body = body("{}");
  const invalid = identifiers(r);
  assert.equal(invalid.length, 1);
  assert.match(invalid[0].note!, /Not parsed/);
  r.response.headers = [];
  assert.deepEqual(identifiers(r), []);
});
test("phase 3: marker windows are session-scoped and candidate rules are explicit", () => {
  const s = samplePackage().session;
  assert.equal(aroundMarker(s.requests, s.markers[0], 1, 0).length, 1);
  assert.equal(
    aroundMarker(s.requests, { ...s.markers[0], sessionId: "other" }, 30, 30).length,
    0
  );
  const r = structuredClone(s.requests[0]);
  r.response.body = body('{"success":false}', "application/json");
  assert.deepEqual(candidateReasons(r, defaultCandidateRules), []);
  assert.ok(
    candidateReasons(r, { ...defaultCandidateRules, businessEnabled: true }).some((x) =>
      x.includes("success = false")
    )
  );
  assert.deepEqual(
    candidateReasons(r, {
      ...defaultCandidateRules,
      businessEnabled: true,
      businessPath: "__proto__.polluted",
    }),
    []
  );
  assert.ok(candidateReasons(s.requests[1], defaultCandidateRules).length === 2);
});

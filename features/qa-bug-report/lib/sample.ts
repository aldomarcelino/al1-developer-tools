import { newSession, packageSession, body } from "./model.ts";
export function samplePackage() {
  const start = "2026-10-30T09:00:00.000Z";
  const s = newSession(
    "https://fixture.example.test/checkout",
    "synthetic",
    start,
    "sample-checkout-01"
  );
  s.endedAt = "2026-10-30T09:00:30.000Z";
  s.state = "stopped";
  s.environment = { value: "Synthetic staging fixture", source: "manual" };
  s.build = { value: "demo-1.0", source: "manual" };
  s.requests = [200, 500, 204].map((status, i) => ({
    id: `sample-request-${i + 1}`,
    sessionId: s.id,
    startedAt: `2026-10-30T09:00:${String(10 + i).padStart(2, "0")}.000Z`,
    method: i === 1 ? "POST" : "GET",
    url: `https://fixture.example.test/api/${i === 1 ? "checkout" : "cart"}?item=one&item=two`,
    query: [
      { name: "item", value: "one" },
      { name: "item", value: "two" },
    ],
    headers: [
      { name: "Authorization", value: "Bearer DUMMY_SAMPLE_TOKEN" },
      { name: "Content-Type", value: "application/json" },
    ],
    body:
      i === 1
        ? body('{"product":"Tea","token":"DUMMY_SAMPLE_TOKEN"}', "application/json")
        : body(""),
    response: {
      status,
      statusText: status === 500 ? "Internal Server Error" : "OK",
      headers: [
        { name: "x-request-id", value: `server-demo-${i + 1}` },
        {
          name: "traceparent",
          value: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        },
      ],
      body:
        status === 204
          ? body("", "application/json", "Empty")
          : body(
              JSON.stringify(
                status === 500
                  ? { error: "Checkout failed", traceId: "trace-checkout-demo" }
                  : { ok: true }
              ),
              "application/json"
            ),
    },
    durationMs: i === 1 ? 2300 : 80,
    timings: { wait: i === 1 ? 2200 : 70 },
    completeness: [],
  }));
  s.markers = [
    {
      id: "sample-marker-1",
      sessionId: s.id,
      at: "2026-10-30T09:00:11.500Z",
      description: "Checkout spinner stopped; error appeared",
      source: "capture",
    },
  ];
  s.report = {
    ...s.report,
    title: "Checkout fails after submitting the cart",
    description: "Synthetic example only",
    steps: "1. Add tea to the cart.\n2. Submit checkout.",
    expected: "Order confirmation appears.",
    actual: "Checkout reports an error.",
    frequency: "always",
    requestIds: ["sample-request-2"],
    markerIds: ["sample-marker-1"],
  };
  return packageSession(s);
}

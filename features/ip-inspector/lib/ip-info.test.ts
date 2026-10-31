import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIp, isPrivateIp, type IpInfo } from "./ip.ts";
import { ipInfoResponse } from "./ip-info.ts";
import { parseCandidate } from "./webrtc.ts";

test("IP validation rejects URLs and malformed addresses and classifies local ranges", () => {
  for (const input of [
    "",
    "example.com",
    "8.8.8.8/path",
    "256.1.2.3",
    "01.2.3.4",
    "::1%lo0",
    "1:2:3",
    "https://8.8.8.8",
    "1.2.3.4?x=1",
  ])
    assert.equal(normalizeIp(input), null, input);
  assert.equal(normalizeIp("2001:4860:4860:0:0:0:0:8888"), "2001:4860:4860::8888");
  for (const input of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "169.254.1.1",
    "100.64.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:192.168.1.1",
  ])
    assert.ok(isPrivateIp(input), input);
  for (const input of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.ok(!isPrivateIp(input), input);
});

test("visitor metadata comes from cf and remains private across distinct requests", async () => {
  const request = new Request("https://ramupod.test/api/ip-info", {
    headers: { "cf-connecting-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" },
  });
  Object.assign(request, {
    cf: {
      country: "ID",
      city: "Jakarta",
      region: "Jakarta",
      postalCode: "10110",
      latitude: "-6.2",
      longitude: "106.8",
      timezone: "Asia/Jakarta",
      asn: 15169,
      asOrganization: "Test network",
      httpProtocol: "HTTP/3",
      tlsVersion: "TLSv1.3",
    },
  });
  const response = await ipInfoResponse(request, (() => {
    throw new Error("Must not fetch for visitor");
  }) as typeof fetch);
  const data = (await response.json()) as IpInfo;
  assert.equal(data.ip, "8.8.8.8");
  assert.equal(data.city, "Jakarta");
  assert.equal(data.source, "cloudflare");
  assert.equal(data.asn, 15169);
  assert.equal(data.tlsVersion, "TLSv1.3");
  assert.match(response.headers.get("Cache-Control")!, /private, no-store/);
  assert.equal(response.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  const second = (await (
    await ipInfoResponse(
      new Request(request.url, { headers: { "x-forwarded-for": "1.1.1.1, 10.0.0.1" } })
    )
  ).json()) as IpInfo;
  assert.equal(second.ip, "1.1.1.1");
  assert.equal(second.city, null);
  const local = (await (await ipInfoResponse(new Request(request.url))).json()) as IpInfo;
  assert.equal(local.ip, null);
  assert.equal(local.source, "unavailable");
  assert.match(local.notice!, /Cloudflare/);
});

test("custom lookup validates before fetching and handles upstream errors", async () => {
  for (const ip of ["", "localhost", "127.0.0.1", "192.168.1.1", "::1", "8.8.8.8/foo"]) {
    const response = await ipInfoResponse(
      new Request(`https://ramupod.test/api/ip-info?ip=${encodeURIComponent(ip)}`),
      (() => {
        throw new Error("Must not fetch");
      }) as typeof fetch
    );
    assert.equal(response.status, 400);
  }
  const request = new Request("https://ramupod.test/api/ip-info?ip=8.8.8.8");
  const ok = await ipInfoResponse(request, (async (url, options) => {
    assert.equal(url, "https://ipapi.co/8.8.8.8/json/");
    assert.equal(options?.redirect, "error");
    return Response.json({
      ip: "8.8.8.8",
      city: "Mountain View",
      org: "Google",
      asn: "AS15169",
    });
  }) as typeof fetch);
  const data = (await ok.json()) as IpInfo;
  assert.equal(data.source, "ipapi.co");
  assert.equal(data.httpProtocol, null);
  for (const [response, status] of [
    [new Response("", { status: 429 }), 429],
    [new Response("", { status: 500 }), 502],
    [Response.json({ error: true }), 422],
    [Response.json({ ip: "1.1.1.1" }), 502],
    [new Response("not json"), 502],
  ] as const) {
    assert.equal(
      (await ipInfoResponse(request, (async () => response) as typeof fetch)).status,
      status
    );
  }
  assert.equal(
    (
      await ipInfoResponse(request, (async () => {
        throw new DOMException("Timeout", "TimeoutError");
      }) as typeof fetch)
    ).status,
    502
  );
});

test("WebRTC candidate parsing distinguishes mDNS, local and public addresses", () => {
  assert.equal(
    parseCandidate("candidate:1 1 udp 1 192.168.1.1 123 typ host")?.kind,
    "local / private"
  );
  assert.equal(
    parseCandidate("candidate:1 1 udp 1 abc-123.local 123 typ host")?.kind,
    "mDNS (hidden)"
  );
  assert.equal(
    parseCandidate("candidate:1 1 udp 1 8.8.8.8 123 typ srflx raddr 0.0.0.0 rport 0")
      ?.kind,
    "public"
  );
  assert.equal(parseCandidate("garbage"), null);
});

test("WebRTC inspection closes its connection on completion and cancellation", async () => {
  const { inspectWebRtc } = await import("./webrtc.ts");
  let closed = 0;
  let automaticCompletion = true;
  class Peer {
    onicecandidate:
      ((event: { candidate: { candidate: string } | null }) => void) | null = null;
    createDataChannel() {}
    async createOffer() {
      return {};
    }
    async setLocalDescription() {
      if (automaticCompletion)
        queueMicrotask(() => {
          this.onicecandidate?.({
            candidate: { candidate: "candidate:1 1 udp 1 abc.local 123 typ host" },
          });
          this.onicecandidate?.({ candidate: null });
        });
    }
    close() {
      closed++;
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, "RTCPeerConnection");
  Object.defineProperty(globalThis, "RTCPeerConnection", {
    value: Peer,
    configurable: true,
  });
  try {
    const result = await inspectWebRtc(new AbortController().signal);
    assert.equal(result.status, "complete");
    assert.equal(result.addresses[0].kind, "mDNS (hidden)");
    assert.equal(closed, 1);
    automaticCompletion = false;
    const controller = new AbortController();
    const pending = inspectWebRtc(controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(closed, 2);
  } finally {
    if (original) Object.defineProperty(globalThis, "RTCPeerConnection", original);
    else Reflect.deleteProperty(globalThis, "RTCPeerConnection");
  }
});

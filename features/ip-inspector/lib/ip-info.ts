import { normalizeIp, isPrivateIp, type IpInfo } from "./ip.ts";

type EdgeRequest = Request & { cf?: Record<string, unknown> };
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
function scalar(value: unknown): string | number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : text(value);
}
function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Injectable fetch keeps provider failures and visitor isolation testable. */
export async function ipInfoResponse(
  request: EdgeRequest,
  fetcher: typeof fetch = fetch
) {
  const url = new URL(request.url);
  if (url.searchParams.has("ip")) {
    const ip = normalizeIp(url.searchParams.get("ip") ?? "");
    if (!ip || isPrivateIp(ip))
      return json({ error: "Enter a valid public IPv4 or IPv6 address." }, 400);
    try {
      // Fixed HTTPS origin + validated IP only: never fetch a user-supplied URL.
      const response = await fetcher(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
        cache: "no-store",
      });
      if (response.status === 429)
        return json(
          { error: "The free lookup service is rate limited. Please try again later." },
          429
        );
      if (!response.ok) throw new Error("provider");
      const data = (await response.json()) as Record<string, unknown>;
      if (data.error)
        return json(
          { error: "This IP could not be located by the free lookup service." },
          422
        );
      if (normalizeIp(text(data.ip) ?? "") !== ip)
        throw new Error("invalid provider response");
      const result: IpInfo = {
        ip,
        source: "ipapi.co",
        country: text(data.country_name) ?? text(data.country),
        city: text(data.city),
        region: text(data.region),
        postalCode: text(data.postal),
        latitude: scalar(data.latitude),
        longitude: scalar(data.longitude),
        timezone: text(data.timezone),
        asn: scalar(data.asn),
        asOrganization: text(data.org),
        httpProtocol: null,
        tlsVersion: null,
        notice:
          "Custom lookup via ipapi.co. Geolocation is approximate; HTTP/TLS belong only to your current connection.",
      };
      return json(result);
    } catch {
      return json(
        {
          error:
            "The free IP lookup service is unavailable or timed out. Please try again.",
        },
        502
      );
    }
  }
  const cf = request.cf ?? {};
  const ip =
    normalizeIp(request.headers.get("cf-connecting-ip") ?? "") ??
    normalizeIp(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "");
  const edge = Object.keys(cf).length > 0;
  const result: IpInfo = {
    ip,
    source: edge ? "cloudflare" : ip ? "headers" : "unavailable",
    country: text(cf.country) ?? text(request.headers.get("cf-ipcountry")),
    city: text(cf.city),
    region: text(cf.region),
    postalCode: text(cf.postalCode),
    latitude: scalar(cf.latitude),
    longitude: scalar(cf.longitude),
    timezone: text(cf.timezone),
    asn: scalar(cf.asn),
    asOrganization: text(cf.asOrganization),
    httpProtocol: text(cf.httpProtocol),
    tlsVersion: text(cf.tlsVersion),
    notice: edge
      ? "Geolocation is approximate and describes your network exit point."
      : "Cloudflare edge metadata is unavailable in this environment. Deploy to Cloudflare Workers for visitor location, ASN, HTTP, and TLS details.",
  };
  return json(result);
}

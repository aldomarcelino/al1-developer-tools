/** Pure IP parsing for both the browser and Cloudflare Workers (no Node APIs). */
export function normalizeIp(input: string): string | null {
  const value = input.trim();
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split(".");
    return parts.every((part) => String(Number(part)) === part && Number(part) <= 255)
      ? value
      : null;
  }
  if (!value.includes(":") || !/^[a-fA-F0-9:.]+$/.test(value)) return null;
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
}

export function isPrivateIp(input: string): boolean {
  const ip = normalizeIp(input);
  if (!ip) return false;
  if (ip.includes(":")) {
    // URL normalizes IPv4-mapped IPv6 to hex; classify the underlying address.
    const mapped = ip.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
    if (mapped) {
      const high = parseInt(mapped[1], 16),
        low = parseInt(mapped[2], 16);
      return isPrivateIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return (
      ip === "::" ||
      ip === "::1" ||
      /^(?:f[cd]|fe[89ab]|ff)/i.test(ip) ||
      ip.startsWith("2001:db8:")
    );
  }
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export type IpInfo = {
  ip: string | null;
  source: "cloudflare" | "headers" | "ipapi.co" | "unavailable";
  country: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  timezone: string | null;
  asn: string | number | null;
  asOrganization: string | null;
  httpProtocol: string | null;
  tlsVersion: string | null;
  notice: string | null;
};

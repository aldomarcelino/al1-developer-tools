export const hashAlgorithms = ["SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number];
export async function hashBuffer(
  buffer: ArrayBuffer,
  algorithm: HashAlgorithm
): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
export function compareChecksum(
  actual: string,
  expected: string
): "empty" | "invalid" | "match" | "different" {
  const normalized = expected.trim().toLowerCase();
  if (!normalized) return "empty";
  if (!/^[a-f0-9]+$/.test(normalized) || normalized.length !== actual.length)
    return "invalid";
  return normalized === actual ? "match" : "different";
}

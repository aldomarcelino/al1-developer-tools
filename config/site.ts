export function getSiteUrl(
  value = process.env.SITE_URL ?? "https://dotools.com"
): URL | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "SITE_URL must be a plain HTTPS origin without a path, credentials, query, or fragment."
    );
  }
  return new URL(url.origin);
}
export const siteUrl = getSiteUrl();
export const isIndexable =
  process.env.NODE_ENV === "production" && process.env.INDEX_SITE === "true";

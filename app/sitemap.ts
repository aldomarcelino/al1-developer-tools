import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { siteUrl, isIndexable } from "@/lib/site-url";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl || !isIndexable) return [];
  return [
    "/",
    "/about",
    ...tools
      .filter((tool) => tool.status === "available")
      .map((tool) => `/tools/${tool.slug}`),
  ].map((path) => ({ url: new URL(path, siteUrl).href }));
}

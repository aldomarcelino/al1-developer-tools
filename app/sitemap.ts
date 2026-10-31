import type { MetadataRoute } from "next";
import { tools } from "@/config/tools";
import { siteUrl, isIndexable } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl || !isIndexable) return [];
  return [
    "/",
    "/about",
    "/privacy",
    "/terms",
    ...tools
      .filter((tool) => tool.status === "available")
      .map((tool) => `/tools/${tool.slug}`),
  ].map((path) => ({ url: new URL(path, siteUrl).href }));
}

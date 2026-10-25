import type { MetadataRoute } from "next";
import { siteUrl, isIndexable } from "@/lib/site-url";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(siteUrl && isIndexable ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}),
  };
}

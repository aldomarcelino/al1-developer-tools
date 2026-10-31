import type { MetadataRoute } from "next";
import { siteUrl, isIndexable } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(siteUrl && isIndexable ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}),
  };
}

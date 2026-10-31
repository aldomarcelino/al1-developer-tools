import { brand } from "@/config/brand";
import { headers } from "next/headers";
import { availableTool, siteName } from "@/lib/seo/metadata";
import { toolSeo, type ToolSlug } from "@/lib/seo/tool-metadata";
import { personSchema } from "@/lib/seo/person-schema";
import { siteUrl } from "@/config/site";

async function JsonLd({ value }: { value: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, "\\u003c") }}
    />
  );
}
export function SiteStructuredData() {
  if (!siteUrl) return null;
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": new URL("/#website", siteUrl).href,
        url: siteUrl.href,
        name: siteName,
        alternateName: brand.wordmark,
        description: brand.description,
        inLanguage: "en",
        creator: personSchema(),
      }}
    />
  );
}
export function ToolStructuredData({ slug }: { slug: ToolSlug }) {
  const tool = availableTool(slug);
  if (!tool || !siteUrl) return null;
  const url = new URL(`/tools/${slug}`, siteUrl).href;
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            "@id": `${url}#application`,
            url,
            name: toolSeo[slug].title,
            description: toolSeo[slug].description,
            applicationCategory: ["notes", "markdown-editor"].includes(slug)
              ? "ProductivityApplication"
              : slug === "character-counter"
                ? "UtilitiesApplication"
                : "DeveloperApplication",
            operatingSystem: "Any",
            browserRequirements: "Requires JavaScript and a modern web browser",
            isAccessibleForFree: true,
            creator: personSchema(),
            isPartOf: { "@id": new URL("/#website", siteUrl).href },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "All tools", item: siteUrl.href },
              { "@type": "ListItem", position: 2, name: tool.name, item: url },
            ],
          },
        ],
      }}
    />
  );
}
export function AboutStructuredData() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        ...(siteUrl ? { url: new URL("/about", siteUrl).href } : {}),
        name: `About ${brand.name}`,
        creator: personSchema(),
        ...(siteUrl ? { mainEntity: { "@id": new URL("/#website", siteUrl).href } } : {}),
      }}
    />
  );
}

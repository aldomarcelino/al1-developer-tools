import { creator } from "@/lib/creator";
import { availableTool, personSchema, siteName, toolSeo, type ToolSlug } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
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
        alternateName: "Al1 Tools",
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
            applicationCategory: "DeveloperApplication",
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
export function CreatorStructuredData() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        ...(siteUrl ? { url: new URL("/about", siteUrl).href } : {}),
        name: `About ${creator.fullName}`,
        mainEntity: personSchema(),
      }}
    />
  );
}

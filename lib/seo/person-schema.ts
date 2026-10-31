import { creator } from "@/config/creator";
import { siteUrl } from "@/config/site";

export function personSchema() {
  return {
    "@type": "Person",
    ...(siteUrl
      ? {
          "@id": new URL("/about#person", siteUrl).href,
          url: new URL("/about", siteUrl).href,
        }
      : {}),
    name: creator.fullName,
    alternateName: creator.alternateNames,
    jobTitle: creator.role,
    sameAs: [creator.linkedin, creator.github],
  };
}

import type { Metadata } from "next";
import { siteUrl, isIndexable } from "@/config/site";
import { creator } from "@/config/creator";
import { brand } from "@/config/brand";
import { tools } from "@/config/tools";

export const siteName = brand.name;
export const homeTitle = "Useful Online Tools for Documents, Text & Data";
export const homeDescription = brand.description;
import { toolSeo, type ToolSlug } from "./tool-metadata";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  index = true
): Metadata {
  const url = siteUrl ? new URL(path, siteUrl).href : undefined;
  const image = siteUrl
    ? {
        url: new URL("/social-preview.jpg", siteUrl).href,
        width: 1200,
        height: 630,
        alt: `${brand.name} - ${brand.tagline}`,
      }
    : undefined;
  const brandedTitle = `${title} · ${brand.name}`;
  return {
    title: { absolute: brandedTitle },
    description,
    authors: [
      {
        name: creator.fullName,
        ...(siteUrl ? { url: new URL("/about", siteUrl).href } : {}),
      },
    ],
    creator: creator.fullName,
    ...(url ? { alternates: { canonical: url } } : {}),
    robots: {
      index: isIndexable && index,
      follow: true,
      googleBot: {
        index: isIndexable && index,
        follow: true,
        "max-image-preview": "large",
      },
    },
    openGraph: {
      title: brandedTitle,
      description,
      type: "website",
      siteName,
      locale: "en_US",
      ...(url ? { url } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}
export function toolMetadata(slug: ToolSlug): Metadata {
  const { title, description } = toolSeo[slug];
  return pageMetadata(title, description, `/tools/${slug}`);
}
export function availableTool(slug: string) {
  return tools.find((tool) => tool.slug === slug && tool.status === "available");
}

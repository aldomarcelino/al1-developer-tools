import type { Metadata } from "next";
import { siteUrl, isIndexable } from "./site-url";
import { creator } from "./creator";
import { tools } from "./tools";

export const siteName = "Al1 Developer Tools";
export const homeTitle = "Free Developer Tools by Aldo Marcelino";
export const homeDescription =
  "Free browser-based developer tools by Aldo Marcelino NF Lubis: format JSON, preview Markdown, compare text, decode JWTs, and simplify everyday coding tasks.";
export const toolSeo = {
  "json-formatter": {
    title: "JSON Formatter & Validator Online",
    description:
      "Format, validate, and minify JSON online. Choose indentation, upload a JSON file, and copy or download the result. Processing stays in your browser.",
    note: "Paste JSON or upload a file, choose indentation, then select Format or Minify. Native JavaScript number precision applies; encode large integer IDs as strings.",
  },
  "markdown-editor": {
    title: "Markdown Editor & Live Preview",
    description:
      "Write and preview GitHub-flavored Markdown online with tables, task lists, code blocks, and export options. Edit locally in your browser without an account.",
    note: "Write Markdown in the editor and check the rendered preview. Use headings, fenced code blocks, tables, and task lists, then export your work.",
  },
  "diff-viewer": {
    title: "Text & JSON Diff Viewer Online",
    description:
      "Compare text and JSON online in side-by-side or unified views. Find additions and deletions with whitespace and case options. Comparison runs in your browser.",
    note: "Paste the original and changed text into the two editors. Choose your comparison settings and inspect additions and deletions in the result.",
  },
  "jwt-decoder": {
    title: "JWT Decoder — Inspect Headers & Claims",
    description:
      "Decode JWT headers and payloads online, inspect claims, and check expiration timestamps locally. Decoding does not verify signatures or establish token trust.",
    note: "Paste a JSON Web Token to read its header and payload. A readable token is not a verified token: signature validation must happen in your authentication system.",
  },
  "base64-url": {
    title: "Base64 & URL Encoder / Decoder",
    description:
      "Encode and decode Base64, Base64URL, URL percent-encoding, and hexadecimal text online with UTF-8 support. Conversion runs locally in your browser.",
    note: "Choose the encoding and direction, then enter your text. Base64 is an encoding format, not encryption, and does not protect confidential information.",
  },
  "regex-tester": {
    title: "Regex Tester & Replacement Preview",
    description:
      "Test JavaScript regular expressions online. Inspect matches and capture groups, change flags, and preview replacements. No account or server upload needed.",
    note: "Enter a JavaScript regular expression and test text, then inspect matches and capture groups. Keep patterns and inputs small when exploring expensive expressions.",
  },
  "timestamp-converter": {
    title: "Unix Timestamp & Date Converter",
    description:
      "Convert Unix timestamps to readable dates and dates to epoch time. Inspect UTC, local time, and ISO 8601 representations directly in your browser.",
    note: "Enter an epoch timestamp or date to compare its representations. Check the timestamp unit and time zone before using the result in an application.",
  },
  "uuid-generator": {
    title: "Random Keygen, Password & UUID Generator",
    description:
      "Generate passwords, API secrets, HMAC keys, and UUIDs using browser cryptography. Create and copy random values locally without sending them to a server.",
    note: "Select the key format and settings, then generate a value. Keep generated secrets private and store production credentials in your own secret manager.",
  },
  "json-to-typescript": {
    title: "JSON to TypeScript Interface Generator",
    description:
      "Convert JSON examples into TypeScript interfaces or type aliases online. Configure optional and readonly fields. Generate types locally in your browser.",
    note: "Paste a representative JSON example and choose your type settings. Generated types describe the sample; review optional fields and validate runtime data separately.",
  },
  "sql-formatter": {
    title: "SQL Formatter & Minifier Online",
    description:
      "Format and minify SQL queries with indentation and keyword casing options. Improve query readability in your browser without connecting to a database.",
    note: "Paste a query and select formatting options. This tool formats text; it does not execute queries or guarantee that SQL is valid for your database.",
  },
  "curl-to-code": {
    title: "cURL to Code Converter",
    description:
      "Convert cURL commands to JavaScript Fetch, Axios, TypeScript, Python, Go, or PHP request code online. Code is generated locally; requests are not executed.",
    note: "Paste a cURL command and choose a target language. Review generated code and unsupported options before running it; the converter never executes the request.",
  },
} as const;
export type ToolSlug = keyof typeof toolSeo;

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
        alt: "Al1 Developer Tools, created by Aldo Marcelino",
      }
    : undefined;
  return {
    title,
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
      title: `${title} · Al1 Tools`,
      description,
      type: "website",
      siteName,
      locale: "en_US",
      ...(url ? { url } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}
export function toolMetadata(slug: ToolSlug): Metadata {
  const { title, description } = toolSeo[slug];
  return pageMetadata(title, description, `/tools/${slug}`);
}
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
export function availableTool(slug: string) {
  return tools.find((tool) => tool.slug === slug && tool.status === "available");
}

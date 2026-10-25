import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { WebhookComingSoon } from "@/components/webhook-coming-soon";

export const dynamicParams = false;
export function generateStaticParams() {
  return tools.filter((tool) => tool.status === "planned").map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((tool) => tool.slug === slug && tool.status === "planned");
  if (!tool) return {};
  return pageMetadata(
    `${tool.name} — Coming soon`,
    "Preview the upcoming webhook debugging workspace. Capture, inspection, and replay are planned. No endpoints are active and no requests are collected.",
    `/tools/${slug}`,
    false
  );
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "webhook-inspector") notFound();
  return <WebhookComingSoon />;
}

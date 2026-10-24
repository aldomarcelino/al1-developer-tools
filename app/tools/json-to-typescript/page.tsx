import type { Metadata } from "next";
import { JsonToTsWorkspace } from "@/components/json-to-ts-workspace";

export const metadata: Metadata = {
  title: "JSON to TypeScript",
  description:
    "Generate strongly-typed, idiomatic TypeScript interfaces and type aliases from JSON payloads in real-time.",
};

export default function JsonToTypeScriptPage() {
  return <JsonToTsWorkspace />;
}

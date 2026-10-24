import type { Metadata } from "next";
import { KeygenWorkspace } from "@/components/keygen-workspace";

export const metadata: Metadata = {
  title: "Random Keygen & Secret Generator",
  description:
    "Generate cryptographically secure passwords, API tokens, HMAC keys, UUIDs, and secrets completely client-side.",
};

export default function RandomKeygenPage() {
  return <KeygenWorkspace />;
}

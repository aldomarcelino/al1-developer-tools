import type { Metadata } from "next";
import { Base64Workspace } from "@/components/base64-workspace";

export const metadata: Metadata = {
  title: "Base64 & URL Encoder/Decoder",
  description:
    "Encode and decode standard Base64, URL-Safe Base64, URL percent-encoding, and Hex strings with full UTF-8 support.",
};

export default function Base64Page() {
  return <Base64Workspace />;
}

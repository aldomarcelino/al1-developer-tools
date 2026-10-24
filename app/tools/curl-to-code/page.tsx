import type { Metadata } from "next";
import { CurlWorkspace } from "@/components/curl-workspace";

export const metadata: Metadata = {
  title: "cURL to Code",
  description:
    "Convert cURL command lines into idiomatic request code for JavaScript Fetch, Axios, TypeScript, Python Requests, Go net/http, and PHP cURL.",
};

export default function CurlToCodePage() {
  return <CurlWorkspace />;
}

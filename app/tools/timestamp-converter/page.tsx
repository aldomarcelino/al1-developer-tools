import type { Metadata } from "next";
import { TimestampWorkspace } from "@/components/timestamp-workspace";

export const metadata: Metadata = {
  title: "Timestamp Converter",
  description:
    "Convert effortlessly between Unix epoch timestamps and human-readable dates across local, UTC, and ISO 8601 formats.",
};

export default function TimestampConverterPage() {
  return <TimestampWorkspace />;
}

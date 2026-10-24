import type { Metadata } from "next";
import { RegexWorkspace } from "@/components/regex-workspace";

export const metadata: Metadata = {
  title: "Regex Tester",
  description:
    "Test, debug, and explore regular expressions with live match breakdown, capture groups, and replacement preview.",
};

export default function RegexTesterPage() {
  return <RegexWorkspace />;
}

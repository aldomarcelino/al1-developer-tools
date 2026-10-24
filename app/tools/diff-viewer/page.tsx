import { DiffWorkspace } from "@/components/diff-workspace";

export const metadata = {
  title: "Text & JSON Diff Viewer — Side-by-side & Unified Comparison",
  description:
    "Find exactly what changed between two texts, documents, or JSON payloads with side-by-side and unified diff views. 100% private and client-side.",
};

export default function Page() {
  return <DiffWorkspace />;
}

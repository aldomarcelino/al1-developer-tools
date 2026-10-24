import { MarkdownWorkspace } from "@/components/markdown-workspace";

export const metadata = {
  title: "Markdown Editor & Preview — Live GFM Editor",
  description:
    "Write, preview, and export GitHub-flavored Markdown in real time. 100% client-side with word counter, task lists, tables, and HTML export.",
};

export default function Page() {
  return <MarkdownWorkspace />;
}

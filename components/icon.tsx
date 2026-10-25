import {
  Braces,
  FileCode2,
  GitCompareArrows,
  KeyRound,
  CodeXml,
  Regex,
  Clock3,
  Hash,
  FileType2,
  Webhook,
  Database,
  Terminal,
  StickyNote,
} from "lucide-react";
const icons = {
  json: Braces,
  markdown: FileCode2,
  diff: GitCompareArrows,
  key: KeyRound,
  code: CodeXml,
  regex: Regex,
  clock: Clock3,
  hash: Hash,
  types: FileType2,
  webhook: Webhook,
  database: Database,
  terminal: Terminal,
  notes: StickyNote,
};
export function ToolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] || Braces;
  return <Icon size={size} strokeWidth={1.65} />;
}

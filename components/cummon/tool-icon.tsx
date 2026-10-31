import { Braces } from "lucide-react";
import { toolIcons } from "./tool-icons";

export function ToolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = toolIcons[name as keyof typeof toolIcons] || Braces;
  return <Icon size={size} strokeWidth={1.65} />;
}

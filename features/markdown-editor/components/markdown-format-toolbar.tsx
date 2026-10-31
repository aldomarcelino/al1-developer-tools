"use client";

import { Fragment } from "react";
import { ActionButton } from "@/components/ui/action-button";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  FileCode,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Image as ImageIcon,
  Table,
  Minus,
  Upload,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type SnippetAction = {
  title: string;
  icon: LucideIcon;
  prefix: string;
  suffix?: string;
  placeholder?: string;
};

const groups: SnippetAction[][] = [
  [
    {
      title: "Bold (**text**)",
      icon: Bold,
      prefix: "**",
      suffix: "**",
      placeholder: "bold text",
    },
    {
      title: "Italic (*text*)",
      icon: Italic,
      prefix: "*",
      suffix: "*",
      placeholder: "italic text",
    },
    {
      title: "Strikethrough (~~text~~)",
      icon: Strikethrough,
      prefix: "~~",
      suffix: "~~",
      placeholder: "strikethrough text",
    },
  ],
  [
    { title: "Heading 1", icon: Heading1, prefix: "# ", placeholder: "Heading 1" },
    { title: "Heading 2", icon: Heading2, prefix: "## ", placeholder: "Heading 2" },
    { title: "Heading 3", icon: Heading3, prefix: "### ", placeholder: "Heading 3" },
  ],
  [
    {
      title: "Blockquote (> quote)",
      icon: Quote,
      prefix: "> ",
      placeholder: "Quote text",
    },
    {
      title: "Inline Code (`code`)",
      icon: Code,
      prefix: "`",
      suffix: "`",
      placeholder: "code",
    },
    {
      title: "Code Block (```lang)",
      icon: FileCode,
      prefix: "\n```typescript\n",
      suffix: "\n```\n",
      placeholder: "// write code here",
    },
  ],
  [
    { title: "Bullet List (- item)", icon: List, prefix: "- ", placeholder: "List item" },
    {
      title: "Numbered List (1. item)",
      icon: ListOrdered,
      prefix: "1. ",
      placeholder: "List item",
    },
    {
      title: "Task List (- [ ] todo)",
      icon: CheckSquare,
      prefix: "- [ ] ",
      placeholder: "Todo item",
    },
  ],
  [
    {
      title: "Insert Link ([text](url))",
      icon: Link2,
      prefix: "[",
      suffix: "](https://example.com)",
      placeholder: "link title",
    },
    {
      title: "Insert Image (![alt](url))",
      icon: ImageIcon,
      prefix: "![",
      suffix: "](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600)",
      placeholder: "Image alt",
    },
    {
      title: "Insert Table",
      icon: Table,
      prefix: "\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n",
    },
    { title: "Horizontal Rule (---)", icon: Minus, prefix: "\n---\n" },
  ],
];

export function MarkdownFormatToolbar({
  insertSnippet,
  onUpload,
  onClear,
}: {
  insertSnippet: (prefix: string, suffix?: string, placeholder?: string) => void;
  onUpload: () => void;
  onClear: () => void;
}) {
  return (
    <div className="markdown-format-toolbar">
      {groups.map((actions, index) => (
        <Fragment key={index}>
          <div className="format-group">
            {actions.map(({ title, icon: Icon, prefix, suffix, placeholder }) => (
              <ActionButton
                key={title}
                variant="ghost"
                size="sm"
                iconOnly
                title={title}
                onClick={() => insertSnippet(prefix, suffix, placeholder)}
              >
                <Icon size={15} />
              </ActionButton>
            ))}
          </div>
          <div className="format-divider" />
        </Fragment>
      ))}
      <div className="format-group" style={{ marginLeft: "auto" }}>
        <ActionButton
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onUpload}
          title="Upload .md file"
        >
          <Upload size={14} />
        </ActionButton>
        <ActionButton
          variant="danger"
          size="sm"
          iconOnly
          onClick={onClear}
          title="Clear editor"
        >
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </div>
  );
}

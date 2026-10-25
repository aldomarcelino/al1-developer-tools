export interface NoteRichNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: { type: string }[];
  content?: NoteRichNode[];
}
export interface NoteRichDocument extends NoteRichNode {
  type: "doc";
  content: NoteRichNode[];
}
const blocks = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "horizontalRule",
]);
const inline = new Set(["text", "hardBreak"]);
const marks = new Set(["bold", "italic", "strike", "underline", "code"]);
export function richTextToPlainText(node: NoteRichNode): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  return (node.content || [])
    .map(richTextToPlainText)
    .join(["paragraph", "heading", "codeBlock"].includes(node.type) ? "" : "\n");
}
export function validateRichDocument(value: unknown): NoteRichDocument {
  let count = 0;
  function visit(input: unknown, parent: string, depth: number): NoteRichNode {
    if (
      ++count > 20_000 ||
      depth > 32 ||
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    )
      throw new Error("The formatted note is too complex or has invalid content.");
    const n = input as Record<string, unknown>;
    if (typeof n.type !== "string") throw new Error("Invalid rich-text node.");
    const type = n.type;
    const allowed =
      parent === "root"
        ? type === "doc"
        : ["paragraph", "heading"].includes(parent)
          ? inline.has(type)
          : parent === "codeBlock"
            ? type === "text"
            : parent === "bulletList" || parent === "orderedList"
              ? type === "listItem"
              : parent === "taskList"
                ? type === "taskItem"
                : blocks.has(type);
    if (!allowed) throw new Error(`Unsupported note content: ${type}.`);
    const node: NoteRichNode = { type };
    if (type === "text") {
      if (typeof n.text !== "string" || !n.text.length)
        throw new Error("Invalid note text.");
      node.text = n.text;
    } else if (n.text !== undefined) throw new Error("Only text nodes may contain text.");
    if (n.marks !== undefined) {
      if (
        type !== "text" ||
        parent === "codeBlock" ||
        !Array.isArray(n.marks) ||
        n.marks.length > 5
      )
        throw new Error("Invalid text formatting.");
      node.marks = n.marks.map((m: unknown) => {
        if (
          !m ||
          typeof m !== "object" ||
          !("type" in m) ||
          typeof m.type !== "string" ||
          !marks.has(m.type) ||
          Object.keys(m).some((key) => key !== "type")
        )
          throw new Error("Unsupported text formatting.");
        return { type: m.type };
      });
    }
    if (n.attrs !== undefined && n.attrs !== null) {
      if (typeof n.attrs !== "object" || Array.isArray(n.attrs))
        throw new Error("Invalid formatting attributes.");
      const attrs = n.attrs as Record<string, unknown>;
      const allowedAttrs =
        type === "heading"
          ? ["level"]
          : type === "orderedList"
            ? ["start", "type"]
            : type === "taskItem"
              ? ["checked"]
              : type === "codeBlock"
                ? ["language"]
                : [];
      if (Object.keys(attrs).some((key) => !allowedAttrs.includes(key)))
        throw new Error("Unsupported formatting attributes.");
      if (type === "heading") {
        if (![1, 2, 3].includes(attrs.level as number))
          throw new Error("Only H1, H2, and H3 are supported.");
        node.attrs = { level: attrs.level as number };
      }
      if (type === "orderedList") {
        if (
          (attrs.start !== undefined &&
            (!Number.isSafeInteger(attrs.start) ||
              Number(attrs.start) < 1 ||
              Number(attrs.start) > 1_000_000)) ||
          (attrs.type !== undefined && attrs.type !== null && attrs.type !== "1")
        )
          throw new Error("Invalid numbered list.");
        node.attrs = {
          start: Number(attrs.start ?? 1),
          type: attrs.type === "1" ? "1" : null,
        };
      }
      if (type === "taskItem") {
        if (typeof attrs.checked !== "boolean")
          throw new Error("Invalid checklist item.");
        node.attrs = { checked: attrs.checked };
      }
      if (type === "codeBlock") {
        if (
          attrs.language !== null &&
          attrs.language !== undefined &&
          (typeof attrs.language !== "string" ||
            !/^[a-zA-Z0-9_+-]{1,40}$/.test(attrs.language))
        )
          throw new Error("Invalid code language.");
        node.attrs = {
          language: typeof attrs.language === "string" ? attrs.language : null,
        };
      }
    }
    if (type === "heading" && !node.attrs) throw new Error("Heading level is required.");
    if (type === "taskItem" && !node.attrs) node.attrs = { checked: false };
    if (n.content !== undefined) {
      if (
        ["text", "hardBreak", "horizontalRule"].includes(type) ||
        !Array.isArray(n.content)
      )
        throw new Error("Invalid nested note content.");
      node.content = n.content.map((child) => visit(child, type, depth + 1));
    }
    if (
      ["listItem", "taskItem"].includes(type) &&
      node.content?.[0]?.type !== "paragraph"
    )
      throw new Error("List items must start with a paragraph.");
    if (
      ["bulletList", "orderedList", "taskList", "blockquote"].includes(type) &&
      !node.content?.length
    )
      throw new Error("Lists and quotes cannot be empty.");
    return node;
  }
  const document = visit(value, "root", 0) as NoteRichDocument;
  if (!document.content?.length) document.content = [{ type: "paragraph" }];
  if (
    richTextToPlainText(document).length > 100_000 ||
    JSON.stringify(document).length > 1_000_000
  )
    throw new Error(
      "This note is too large. Keep text under 100,000 characters and formatting under 1 MB."
    );
  return document;
}
export function plainTextToRichDocument(content: string): NoteRichDocument {
  const lines = content.split("\n");
  if (lines.length > 2000)
    return {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: null },
          content: [{ type: "text", text: content }],
        },
      ],
    };
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}

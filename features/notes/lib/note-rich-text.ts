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
  "image",
]);
const inline = new Set(["text", "hardBreak"]);
const marks = new Set(["bold", "italic", "strike", "underline", "code"]);

export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed.length > 3_000_000) return false;
  if (trimmed.startsWith("data:image/")) {
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) return false;
    const header = trimmed.slice(0, commaIndex);
    const data = trimmed.slice(commaIndex + 1);
    if (!/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml|avif);base64$/i.test(header)) {
      return false;
    }
    return /^[A-Za-z0-9+/=\r\n]+$/.test(data);
  }
  try {
    const url = new URL(trimmed, "http://localhost");
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function richTextToPlainText(node: NoteRichNode): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image")
    return node.attrs?.alt ? `[Photo: ${node.attrs.alt}]` : "[Photo]";
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
                : type === "image"
                  ? ["src", "alt", "title", "width", "alignment"]
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
      if (type === "image") {
        if (!attrs.src)
          throw new Error("Image source is required.");
        if (!isSafeImageSrc(attrs.src))
          throw new Error("Invalid or unsafe image source.");
        if (
          attrs.alt !== undefined &&
          attrs.alt !== null &&
          (typeof attrs.alt !== "string" || attrs.alt.length > 500)
        )
          throw new Error("Image description is too long.");
        if (
          attrs.title !== undefined &&
          attrs.title !== null &&
          (typeof attrs.title !== "string" || attrs.title.length > 500)
        )
          throw new Error("Image title is too long.");
        if (
          attrs.width !== undefined &&
          attrs.width !== null &&
          (typeof attrs.width !== "string" ||
            !/^(?:[1-9][0-9]?|100)%$|^(?:[5-9][0-9]|[1-9][0-9]{2,3})px$/.test(attrs.width.trim()))
        )
          throw new Error("Invalid image width.");
        if (
          attrs.alignment !== undefined &&
          attrs.alignment !== null &&
          (typeof attrs.alignment !== "string" ||
            !["left", "center", "right"].includes(attrs.alignment))
        )
          throw new Error("Invalid image alignment.");
        node.attrs = {
          src: (attrs.src as string).trim(),
          ...(typeof attrs.alt === "string" && attrs.alt.trim()
            ? { alt: attrs.alt.trim() }
            : {}),
          ...(typeof attrs.title === "string" && attrs.title.trim()
            ? { title: attrs.title.trim() }
            : {}),
          ...(typeof attrs.width === "string" && attrs.width.trim()
            ? { width: attrs.width.trim() }
            : {}),
          ...(typeof attrs.alignment === "string" && ["left", "center", "right"].includes(attrs.alignment)
            ? { alignment: attrs.alignment }
            : {}),
        };
      }
    }
    if (type === "heading" && !node.attrs) throw new Error("Heading level is required.");
    if (type === "taskItem" && !node.attrs) node.attrs = { checked: false };
    if (type === "image" && !node.attrs?.src) throw new Error("Image source is required.");
    if (n.content !== undefined) {
      if (
        ["text", "hardBreak", "horizontalRule", "image"].includes(type) ||
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
    JSON.stringify(document).length > 3_000_000
  )
    throw new Error(
      "This note is too large. Keep text under 100,000 characters and formatting under 3 MB."
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

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function processImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<{ src: string; alt: string }> {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image is too large. Please select an image under 15 MB.");
  }

  const alt = file.name ? file.name.replace(/\.[^/.]+$/, "").trim() : "Photo";

  if (file.type === "image/svg+xml") {
    const dataUrl = await readFileAsDataUrl(file);
    return { src: dataUrl, alt };
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context unavailable."));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const outputType =
            file.type === "image/jpeg" || file.type === "image/jpg"
              ? "image/jpeg"
              : "image/webp";
          resolve(canvas.toDataURL(outputType, quality));
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image."));
        };
        img.src = objectUrl;
      });
      return { src, alt };
    } catch {
      // Fall through to readFileAsDataUrl
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  return { src: dataUrl, alt };
}

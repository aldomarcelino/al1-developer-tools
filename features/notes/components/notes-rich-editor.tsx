"use client";
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  SquareCode,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Undo2,
  Redo2,
  RemoveFormatting,
  Minus,
  Maximize2,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { NotesIconButton } from "./notes-icon-button";
import {
  plainTextToRichDocument,
  processImageFile,
  richTextToPlainText,
  validateRichDocument,
  type NoteRichDocument,
} from "@/features/notes/lib/note-rich-text";
import type { Note } from "@/features/notes/lib/notes";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        alignment?: "left" | "center" | "right";
      }) => ReturnType;
    };
  }
}

export function NoteImageView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const {
    src,
    alt,
    title,
    width = "100%",
    alignment = "center",
  } = (node.attrs || {}) as {
    src: string;
    alt?: string | null;
    title?: string | null;
    width?: string | null;
    alignment?: string | null;
  };
  const [isResizing, setIsResizing] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [caption, setCaption] = useState(alt || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const presets = [
    { label: "25%", value: "25%" },
    { label: "50%", value: "50%" },
    { label: "75%", value: "75%" },
    { label: "100%", value: "100%" },
  ];

  const handlePointerDown = useCallback(
    (direction: "left" | "right") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      const parentEl =
        containerRef.current?.parentElement ||
        (containerRef.current?.closest(".tiptap") as HTMLElement | null);
      const parentWidth = parentEl?.clientWidth || 600;
      const currentWidthPx = containerRef.current?.offsetWidth || parentWidth;
      startWidthRef.current = currentWidthPx;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX =
          direction === "left"
            ? startXRef.current - moveEvent.clientX
            : moveEvent.clientX - startXRef.current;
        const newWidthPx = Math.max(100, Math.min(parentWidth, startWidthRef.current + deltaX));
        const percentage = Math.round((newWidthPx / parentWidth) * 100);
        const clamped = Math.max(15, Math.min(100, percentage));
        updateAttributes({ width: `${clamped}%` });
      };

      const handlePointerUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [updateAttributes]
  );

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    const extMatch = src.match(/data:image\/([a-zA-Z0-9+]+);/);
    const ext = extMatch ? (extMatch[1] === "jpeg" ? "jpg" : extMatch[1]) : "png";
    a.download = `${alt ? alt.replace(/[^\w-]/g, "_") : "note-image"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { src: newSrc } = await processImageFile(file);
      updateAttributes({ src: newSrc });
    } catch (err) {
      console.error("Failed to replace image:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentAlign = alignment || "center";
  const currentWidth = width || "100%";

  return (
    <NodeViewWrapper
      as="div"
      className={`note-image-block note-image-align-${currentAlign} ${
        selected || isResizing ? "is-selected" : ""
      }`}
      style={{
        width: currentWidth,
        maxWidth: "100%",
      }}
      ref={containerRef}
      data-alignment={currentAlign}
      data-width={currentWidth}
    >
      <div className="note-image-inner">
        <img
          src={src}
          alt={alt || ""}
          title={title || ""}
          className="note-image-element"
          loading="lazy"
          draggable={false}
          onDoubleClick={() => setShowLightbox(true)}
        />

        {isResizing && (
          <div className="note-image-size-badge" aria-live="polite">
            {currentWidth}
          </div>
        )}

        <div
          className="note-image-toolbar"
          role="toolbar"
          aria-label="Image formatting"
          contentEditable={false}
        >
          <div className="note-image-size-group">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`note-image-btn ${
                  currentWidth === p.value ? "is-active" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ width: p.value });
                }}
                title={`Set width to ${p.label}`}
                aria-label={`Width ${p.label}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="note-image-divider" />

          <div className="note-image-align-group">
            <button
              type="button"
              className={`note-image-btn note-image-icon-btn ${
                currentAlign === "left" ? "is-active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ alignment: "left" });
              }}
              title="Align Left (text wraps on right)"
              aria-label="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              className={`note-image-btn note-image-icon-btn ${
                currentAlign === "center" ? "is-active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ alignment: "center" });
              }}
              title="Align Center (break text)"
              aria-label="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              className={`note-image-btn note-image-icon-btn ${
                currentAlign === "right" ? "is-active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ alignment: "right" });
              }}
              title="Align Right (text wraps on left)"
              aria-label="Align Right"
            >
              <AlignRight size={14} />
            </button>
          </div>

          <div className="note-image-divider" />

          <button
            type="button"
            className="note-image-btn note-image-icon-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowLightbox(true);
            }}
            title="View full size"
            aria-label="View full size"
          >
            <Maximize2 size={13} />
          </button>

          <button
            type="button"
            className="note-image-btn note-image-icon-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Replace photo"
            aria-label="Replace photo"
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            className="note-image-btn note-image-icon-btn"
            onClick={handleDownload}
            title="Download photo"
            aria-label="Download photo"
          >
            <Download size={13} />
          </button>

          <div className="note-image-divider" />

          <button
            type="button"
            className="note-image-btn note-image-delete-btn note-image-icon-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            title="Delete photo"
            aria-label="Delete photo"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div
          className="note-image-resize-handle is-left"
          onPointerDown={handlePointerDown("left")}
          title="Drag to resize photo"
          aria-label="Drag left to resize photo"
          contentEditable={false}
        />

        <div
          className="note-image-resize-handle is-right"
          onPointerDown={handlePointerDown("right")}
          title="Drag to resize photo"
          aria-label="Drag right to resize photo"
          contentEditable={false}
        />

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleReplace}
        />
      </div>

      <div className="note-image-caption-box" contentEditable={false}>
        <input
          type="text"
          className="note-image-caption-input"
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => {
            const next = e.target.value;
            setCaption(next);
            updateAttributes({ alt: next || null, title: next || null });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {showLightbox && (
        <div
          className="note-image-lightbox"
          onClick={() => setShowLightbox(false)}
          contentEditable={false}
        >
          <div
            className="note-image-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={src} alt={alt || ""} className="note-image-lightbox-img" />
            <div className="note-image-lightbox-bar">
              <span className="note-image-lightbox-caption">
                {caption || "Photo Preview"}
              </span>
              <div className="note-image-lightbox-actions">
                <button
                  type="button"
                  className="note-image-lightbox-btn"
                  onClick={handleDownload}
                  title="Download image"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  className="note-image-lightbox-btn note-image-lightbox-close"
                  onClick={() => setShowLightbox(false)}
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const NoteImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: "100%",
      },
      alignment: {
        default: "center",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (typeof element === "string") return {};
          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt"),
            title: element.getAttribute("title"),
            width: element.getAttribute("data-width") || element.style.width || "100%",
            alignment: element.getAttribute("data-alignment") || "center",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteImageView, {
      attrs: ({ node }) => {
        const alignment = (node.attrs.alignment as string) || "center";
        const width = (node.attrs.width as string) || "100%";
        return {
          class: `node-image note-image-wrapper note-image-align-${alignment}`,
          style: `width: ${width};`,
          "data-alignment": alignment,
          "data-width": width,
        };
      },
    });
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

const DocumentLimit = Extension.create<{ onLimit: (message: string) => void }>({
  name: "notesDocumentLimit",
  addOptions() {
    return { onLimit: () => {} };
  },
  addProseMirrorPlugins() {
    const report = this.options.onLimit;
    return [
      new Plugin({
        filterTransaction(transaction) {
          if (!transaction.docChanged) return true;
          try {
            validateRichDocument(transaction.doc.toJSON());
            return true;
          } catch (error) {
            report(error instanceof Error ? error.message : "This note is too large.");
            return false;
          }
        },
      }),
    ];
  },
});
export function NotesRichEditor({
  note,
  onChange,
  onError,
}: {
  note: Note;
  onChange: (content: string, richText: NoteRichDocument) => void;
  onError: (message: string) => void;
}) {
  const content = useMemo(
    () => note.richText ?? plainTextToRichDocument(note.content),
    [note.richText, note.content]
  );
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        trailingNode: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing… Capture an idea, a meeting, or your next big thing.",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteImage,
      DocumentLimit.configure({ onLimit: onError }),
    ],
    content,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Note content",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items || items.length === 0) return false;
        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of imageFiles) {
            try {
              const { src, alt } = await processImageFile(file);
              editor?.chain().focus().setImage({ src, alt }).run();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to paste photo.");
            }
          }
        })();
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        (async () => {
          for (const file of imageFiles) {
            try {
              const { src, alt } = await processImageFile(file);
              if (coords) {
                editor?.chain().setTextSelection(coords.pos).setImage({ src, alt }).run();
              } else {
                editor?.chain().focus().setImage({ src, alt }).run();
              }
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to insert dropped photo.");
            }
          }
        })();
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const document = validateRichDocument(instance.getJSON());
      onChange(richTextToPlainText(document), document);
    },
  });
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(content)
    )
      editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);
  if (!editor)
    return (
      <div className="notes-rich-loading" role="status">
        Opening editor…
      </div>
    );
  return (
    <div className="notes-rich-editor">
      <NotesFormattingToolbar editor={editor} onError={onError} />
      <EditorContent editor={editor} className="notes-rich-content" />
      <p className="notes-format-hint">
        Tip: select text to format it, insert photos, or start a list with <kbd>-</kbd> and a space.
      </p>
    </div>
  );
}

function NotesFormattingToolbar({
  editor,
  onError,
}: {
  editor: Editor;
  onError: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modifier = useShortcutModifier();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      codeBlock: e.isActive("codeBlock"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      style: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  return (
    <div className="notes-format-toolbar" role="toolbar" aria-label="Text formatting">
      <CustomSelect
        ariaLabel="Text style"
        value={state.style}
        onChange={(value) => {
          const chain = editor.chain().focus();
          if (value === "p") chain.setParagraph().run();
          else chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
        }}
        options={[
          { value: "p", label: "Paragraph" },
          { value: "h1", label: "Heading 1" },
          { value: "h2", label: "Heading 2" },
          { value: "h3", label: "Heading 3" },
        ]}
      />
      <span className="notes-format-divider" />
      <NotesIconButton
        label={`Bold (${modifier}+B)`}
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </NotesIconButton>
      <NotesIconButton
        label={`Italic (${modifier}+I)`}
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </NotesIconButton>
      <NotesIconButton
        label={`Underline (${modifier}+U)`}
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={16} />
      </NotesIconButton>
      <NotesIconButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </NotesIconButton>
      <span className="notes-format-divider" />
      <NotesIconButton
        label="Bullet list"
        active={state.bullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={17} />
      </NotesIconButton>
      <NotesIconButton
        label="Numbered list"
        active={state.ordered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={17} />
      </NotesIconButton>
      <NotesIconButton
        label="Checklist"
        active={state.task}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks size={17} />
      </NotesIconButton>
      <NotesIconButton
        label="Quote"
        active={state.quote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </NotesIconButton>
      <NotesIconButton
        label="Insert photo"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon size={16} />
      </NotesIconButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={async (event) => {
          const files = event.target.files;
          if (!files || files.length === 0) return;
          for (const file of Array.from(files)) {
            try {
              const { src, alt } = await processImageFile(file);
              editor.chain().focus().setImage({ src, alt }).run();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to insert photo.");
            }
          }
          event.target.value = "";
        }}
      />
      <span className="notes-format-divider" />
      <NotesIconButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={17} />
      </NotesIconButton>
      <NotesIconButton
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <SquareCode size={16} />
      </NotesIconButton>
      <NotesIconButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={16} />
      </NotesIconButton>
      <NotesIconButton
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting size={16} />
      </NotesIconButton>
      <span className="notes-format-divider" />
      <NotesIconButton
        label={`Undo (${modifier}+Z)`}
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </NotesIconButton>
      <NotesIconButton
        label={`Redo (${modifier}+Shift+Z)`}
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </NotesIconButton>
    </div>
  );
}

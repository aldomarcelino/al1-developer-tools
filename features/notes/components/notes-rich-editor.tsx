"use client";
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier";
import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Extension, type Editor } from "@tiptap/core";
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
  Undo2,
  Redo2,
  RemoveFormatting,
  Minus,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { NotesIconButton } from "./notes-icon-button";
import {
  plainTextToRichDocument,
  richTextToPlainText,
  validateRichDocument,
  type NoteRichDocument,
} from "@/features/notes/lib/note-rich-text";
import type { Note } from "@/features/notes/lib/notes";
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
      <NotesFormattingToolbar editor={editor} />
      <EditorContent editor={editor} className="notes-rich-content" />
      <p className="notes-format-hint">
        Tip: select text to format it, or start a list with <kbd>-</kbd> and a space.
      </p>
    </div>
  );
}

function NotesFormattingToolbar({ editor }: { editor: Editor }) {
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

"use client";

import styles from "../styles.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Info,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { NotesIconButton } from "./notes-icon-button";
import { NotesRichEditor } from "./notes-rich-editor";
import { ToolHeader } from "@/components/cummon/tool-header";
import { useLocalNotes } from "@/features/notes/hooks/use-local-notes";
import {
  addNote,
  createNote,
  deleteNote,
  duplicateNote,
  formatNoteTime,
  importNotes,
  NOTES_LIMITS,
  parseNotesDocument,
  pinNote,
  searchNotes,
  serializeNotes,
  updateNote,
  type ImportMode,
  type Note,
} from "@/features/notes/lib/notes";

type Modal =
  | { kind: "delete"; note: Note }
  | { kind: "import"; notes: Note[]; name: string }
  | { kind: "reset" | "reload" | "keep" };
function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function NotesWorkspace() {
  const store = useLocalNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"list" | "editor">("list");
  const [modal, setModal] = useState<Modal | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("copies");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editorPane = useRef<HTMLElement>(null);
  const listPane = useRef<HTMLElement>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const sorted = useMemo(() => searchNotes(store.notes, ""), [store.notes]);
  const visible = useMemo(() => searchNotes(store.notes, query), [store.notes, query]);
  const selected =
    store.notes.find((note) => note.id === selectedId) || sorted[0] || null;
  useEffect(() => {
    if (modal) {
      const active = document.activeElement;
      dialogReturnFocus.current =
        active instanceof HTMLElement && active !== fileInput.current
          ? active
          : importButton.current;
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  function closeModal() {
    dialog.current?.close();
    setModal(null);
    const target = dialogReturnFocus.current;
    if (target?.isConnected) target.focus();
    else importButton.current?.focus();
  }
  function act(action: () => void) {
    try {
      setActionError("");
      setNotice("");
      action();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "This action could not be completed."
      );
    }
  }
  function newNote() {
    act(() => {
      const note = createNote();
      store.change((notes) => addNote(notes, note));
      setSelectedId(note.id);
      setQuery("");
      setPanel("editor");
      requestAnimationFrame(() => titleInput.current?.focus());
    });
  }
  function showList() {
    setPanel("list");
    requestAnimationFrame(() => listPane.current?.focus({ preventScroll: true }));
  }
  function edit(changes: Partial<Pick<Note, "title" | "content" | "richText">>) {
    if (!selected) return;
    setSelectedId(selected.id);
    setActionError("");
    store.change((notes) => {
      const latest = notes.find((n) => n.id === selected.id);
      return latest
        ? updateNote(notes, latest.id, {
            title: changes.title ?? latest.title,
            content: changes.content ?? latest.content,
            ...(changes.richText ? { richText: changes.richText } : {}),
          })
        : notes;
    });
  }
  function duplicate(noteId = selected?.id) {
    if (!noteId) return;
    act(() => {
      const id = crypto.randomUUID();
      store.change((notes) => duplicateNote(notes, noteId, Date.now(), id));
      setSelectedId(id);
      setPanel("editor");
      setQuery("");
    });
  }
  function exportNotes() {
    act(() => {
      downloadText(
        serializeNotes(store.notes),
        `ramupod-notes-${new Date().toISOString().slice(0, 10)}.json`
      );
      setNotice("JSON export downloaded. Keep your backup somewhere safe.");
    });
  }
  async function readImport(file?: File) {
    if (!file) return;
    setActionError("");
    setNotice("");
    setReading(true);
    try {
      if (file.size > NOTES_LIMITS.fileBytes)
        throw new Error("Choose a JSON export smaller than 5 MB.");
      const data = parseNotesDocument(await file.text());
      setImportMode("copies");
      setModal({ kind: "import", notes: data.notes, name: file.name });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not read this file."
      );
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function confirm() {
    act(() => {
      if (!modal) return;
      if (modal.kind === "delete") {
        store.change((notes) => deleteNote(notes, modal.note.id));
        if (selected?.id === modal.note.id) setSelectedId(null);
      }
      if (modal.kind === "import") {
        store.change((notes) => importNotes(notes, modal.notes, importMode));
        setSelectedId(null);
        setQuery("");
        setNotice("Import applied to the editor.");
      }
      if (modal.kind === "reset") store.reset();
      if (modal.kind === "reload") store.reload();
      if (modal.kind === "keep") store.keepThisTab();
      closeModal();
    });
  }
  const status =
    store.status === "loading"
      ? "Opening local notes…"
      : store.status === "pending"
        ? "Unsaved changes · saving shortly…"
        : store.status === "saved"
          ? "Saved in this browser"
          : store.status === "error"
            ? "Not saved · action needed"
            : "Ready · no notes saved yet";
  const conflict = store.error?.code === "conflict";
  return (
    <div className={`workspace-page page-width notes-page ${styles.scope}`}>
      <ToolHeader title="Notes" icon={<StickyNote size={24} />} />
      <div className="notes-toolbar">
        <div className="toolbar-group">
          <button className="button primary" onClick={newNote} disabled={!store.loaded}>
            <Plus size={16} />
            New note
          </button>
          <button
            className="button"
            ref={importButton}
            onClick={() => fileInput.current?.click()}
            disabled={!store.loaded || reading}
          >
            {reading ? (
              <Loader2 className="notes-spin" size={15} />
            ) : (
              <Upload size={15} />
            )}
            Import JSON
          </button>
          <button
            className="button"
            onClick={exportNotes}
            disabled={!store.loaded || !store.notes.length}
          >
            <Download size={15} />
            Export JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => void readImport(event.target.files?.[0])}
          />
        </div>
        <span
          className={`notes-save-status ${store.status === "error" ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {store.status === "loading" || store.status === "pending" ? (
            <Loader2 size={14} className="notes-spin" />
          ) : store.status === "saved" ? (
            <Check size={15} />
          ) : (
            <Info size={14} />
          )}{" "}
          {status}
        </span>
      </div>
      {store.error && (
        <div className="notes-alert" role="alert">
          <Info size={17} />
          <div>
            <strong>{store.error.message}</strong>
            <div className="notes-recovery-actions">
              {conflict ? (
                <>
                  <button onClick={() => setModal({ kind: "reload" })}>
                    Load other tab’s version
                  </button>
                  <button onClick={() => setModal({ kind: "keep" })}>
                    Keep this tab’s version
                  </button>
                </>
              ) : store.loaded ? (
                <button onClick={store.flush}>Retry saving</button>
              ) : (
                <>
                  <button onClick={store.reload}>Retry opening notes</button>
                  {store.error.raw !== undefined && (
                    <>
                      <button
                        onClick={() =>
                          downloadText(store.error!.raw!, "ramupod-notes-recovery.json")
                        }
                      >
                        Download original data
                      </button>
                      <button onClick={() => setModal({ kind: "reset" })}>
                        Reset local notes
                      </button>
                    </>
                  )}
                </>
              )}
              {store.loaded && store.notes.length > 0 && (
                <button onClick={exportNotes}>Export unsaved notes</button>
              )}
            </div>
          </div>
        </div>
      )}
      {actionError && (
        <p className="notes-action-message is-error" role="alert">
          {actionError}
        </p>
      )}
      {notice && (
        <p className="notes-action-message" role="status">
          {notice}
        </p>
      )}
      <div className="notes-mobile-switch" aria-label="Notes panels">
        <button aria-pressed={panel === "list"} onClick={() => setPanel("list")}>
          Notes <span>{store.notes.length}</span>
        </button>
        <button
          aria-pressed={panel === "editor"}
          disabled={!selected}
          onClick={() => setPanel("editor")}
        >
          Editor
        </button>
      </div>
      <div
        className={`notes-workspace notes-show-${panel}`}
        aria-busy={store.status === "loading"}
      >
        <section
          className="notes-list-pane"
          aria-label="Your notes"
          ref={listPane}
          tabIndex={-1}
        >
          <div className="notes-list-heading">
            <strong>
              Your notes <span>{store.notes.length}</span>
            </strong>
            <span>Pinned first</span>
          </div>
          <div className="notes-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search notes"
              placeholder="Search title or content…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!store.loaded}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear notes search"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="notes-list">
            {!store.loaded ? (
              <div className="notes-empty-list">
                <FileText size={26} />
                <p>
                  {store.status === "loading"
                    ? "Opening your notes…"
                    : "Resolve the storage issue above to continue."}
                </p>
              </div>
            ) : !visible.length ? (
              <div className="notes-empty-list">
                {query ? <Search size={26} /> : <StickyNote size={28} />}
                <strong>{query ? "No matching notes" : "A clean slate."}</strong>
                <p>
                  {query
                    ? "Try a different word or clear your search."
                    : "Save your first thought. It doesn’t need to be polished."}
                </p>
                {query ? (
                  <button className="notes-text-button" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                ) : (
                  <button className="notes-text-button" onClick={newNote}>
                    Create your first note <Plus size={14} />
                  </button>
                )}
              </div>
            ) : (
              visible.map((note) => (
                <div
                  key={note.id}
                  className={`notes-list-item ${selected?.id === note.id ? "is-selected" : ""}`}
                  role="group"
                  aria-label={note.title.trim() || "Untitled note"}
                >
                  <button
                    className="notes-select-note"
                    aria-current={selected?.id === note.id ? "true" : undefined}
                    onClick={() => {
                      setSelectedId(note.id);
                      setPanel("editor");
                      requestAnimationFrame(() =>
                        editorPane.current?.focus({ preventScroll: true })
                      );
                    }}
                  >
                    <span className="notes-list-title">
                      {note.pinned && <Pin size={12} aria-label="Pinned" />}
                      <strong>{note.title.trim() || "Untitled note"}</strong>
                    </span>
                    <span className="notes-list-preview">
                      {note.content.trim().replace(/\s+/g, " ") || "No content yet"}
                    </span>
                  </button>
                  <div className="notes-list-item-footer">
                    <time dateTime={new Date(note.updatedAt).toISOString()}>
                      Last updated {formatNoteTime(note.updatedAt)}
                    </time>
                    <div className="notes-row-actions" aria-label="Note actions">
                      <NotesIconButton
                        label={note.pinned ? "Unpin note" : "Pin note"}
                        active={note.pinned}
                        onClick={() => store.change((notes) => pinNote(notes, note.id))}
                      >
                        {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </NotesIconButton>
                      <NotesIconButton
                        label="Duplicate note"
                        onClick={() => duplicate(note.id)}
                      >
                        <Copy size={14} />
                      </NotesIconButton>
                      <NotesIconButton
                        label="Delete note"
                        className="notes-delete"
                        onClick={() => setModal({ kind: "delete", note })}
                      >
                        <Trash2 size={14} />
                      </NotesIconButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="notes-list-footer">
            <ShieldCheck size={13} />
            Your notes stay on this device.
          </div>
        </section>
        <section
          className="notes-editor-pane"
          aria-label="Note editor"
          ref={editorPane}
          tabIndex={-1}
        >
          {selected && store.loaded ? (
            <>
              <div className="notes-editor-toolbar">
                <button
                  className="notes-text-button notes-back"
                  aria-label="Back to notes"
                  onClick={showList}
                >
                  <ArrowLeft size={15} />
                  All notes
                </button>
              </div>
              <div className="notes-editor-fields">
                <input
                  ref={titleInput}
                  className="notes-title-input"
                  aria-label="Note title"
                  placeholder="Untitled note"
                  value={selected.title}
                  maxLength={NOTES_LIMITS.title}
                  onChange={(e) => edit({ title: e.target.value })}
                />
                <time
                  className="notes-updated"
                  dateTime={new Date(selected.updatedAt).toISOString()}
                >
                  Last updated {formatNoteTime(selected.updatedAt)}
                </time>
                <NotesRichEditor
                  key={selected.id}
                  note={selected}
                  onChange={(content, richText) => edit({ content, richText })}
                  onError={setActionError}
                />
              </div>
              <div className="notes-editor-footer">
                <span>
                  {selected.content.length.toLocaleString()} / 100,000 characters
                </span>
                <span>Created {formatNoteTime(selected.createdAt)}</span>
              </div>
            </>
          ) : (
            <div className="notes-editor-empty">
              <span className="notes-empty-icon">
                <StickyNote size={31} />
              </span>
              <span className="notes-eyebrow">A LITTLE SPACE TO THINK</span>
              <h2>Keep the useful bits.</h2>
              <p>
                Meeting notes, a checklist, or your next idea. Pick a note, or start a
                fresh one.
              </p>
              <button
                className="button primary"
                onClick={newNote}
                disabled={!store.loaded}
              >
                <Plus size={16} />
                Create a note
              </button>
            </div>
          )}
        </section>
      </div>
      <p className="notes-privacy">
        <ShieldCheck size={16} />
        <span>
          <strong>Local means local.</strong> Notes are stored only in this browser, are
          not encrypted by this tool, and do not sync across devices. Clearing site data
          removes them. Export backups, and avoid passwords, API keys, or other sensitive
          credentials.
        </span>
      </p>
      <dialog
        ref={dialog}
        className="notes-dialog"
        aria-labelledby="notes-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        {modal && (
          <div className="notes-dialog-content">
            <div className="notes-dialog-heading">
              <h2 id="notes-dialog-title">
                {modal.kind === "delete"
                  ? "Delete this note?"
                  : modal.kind === "import"
                    ? "Import your notes"
                    : modal.kind === "reset"
                      ? "Reset local notes?"
                      : modal.kind === "reload"
                        ? "Load the other version?"
                        : "Keep this tab’s version?"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>
            {modal.kind === "delete" ? (
              <p>
                “{modal.note.title.trim() || "Untitled note"}” will be permanently removed
                from this browser. Export a backup first if you need to keep it.
              </p>
            ) : modal.kind === "import" ? (
              <>
                <p>
                  <strong>
                    {modal.notes.length} valid{" "}
                    {modal.notes.length === 1 ? "note" : "notes"}
                  </strong>{" "}
                  found in {modal.name}. You currently have {store.notes.length}.
                </p>
                <fieldset className="notes-import-options">
                  <legend>How should these notes be imported?</legend>
                  {(
                    [
                      [
                        "copies",
                        "Add as copies",
                        "Keep every existing note. Imported notes receive new IDs.",
                      ],
                      [
                        "merge",
                        "Merge by ID",
                        "Add new IDs. Matching IDs are overwritten with the imported version.",
                      ],
                      [
                        "replace",
                        "Replace all notes",
                        "Remove your current collection and use only the imported notes.",
                      ],
                    ] as const
                  ).map(([value, label, description]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="import-mode"
                        value={value}
                        checked={importMode === value}
                        onChange={() => setImportMode(value)}
                      />
                      <span>
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {importMode === "replace" && (
                  <p className="notes-import-warning">
                    This replaces all {store.notes.length} existing notes. Export a backup
                    before continuing.
                  </p>
                )}
              </>
            ) : (
              <p>
                {modal.kind === "reset"
                  ? "This permanently replaces unreadable stored data with an empty collection. Download the original data above before resetting."
                  : modal.kind === "reload"
                    ? "Unsaved changes in this tab will be discarded and the stored version will be loaded."
                    : "This overwrites the stored version with the notes currently open in this tab. Changes from the other tab will be replaced."}
              </p>
            )}
            {actionError && (
              <p className="notes-action-message is-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="notes-dialog-actions">
              <button className="button" onClick={closeModal}>
                Cancel
              </button>
              <button
                className={`button ${modal.kind === "delete" || modal.kind === "reset" ? "notes-danger-button" : "primary"}`}
                onClick={confirm}
              >
                {modal.kind === "delete"
                  ? "Delete note"
                  : modal.kind === "import"
                    ? importMode === "replace"
                      ? "Replace all notes"
                      : "Import notes"
                    : modal.kind === "reset"
                      ? "Reset notes"
                      : modal.kind === "reload"
                        ? "Discard & load"
                        : "Overwrite with this tab"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

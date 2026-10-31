import {
  validateRichDocument,
  richTextToPlainText,
  type NoteRichDocument,
} from "./note-rich-text.ts";
export const NOTES_STORAGE_KEY = "al1-local-notes";
export const NOTES_VERSION = 2;
export const NOTES_LIMITS = {
  count: 500,
  title: 200,
  content: 100_000,
  fileBytes: 5 * 1024 * 1024,
};
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  richText?: NoteRichDocument;
}
export interface NotesDocument {
  version: 2;
  notes: Note[];
}
export type ImportMode = "copies" | "merge" | "replace";
export class NotesError extends Error {
  code: "invalid" | "storage" | "quota" | "conflict";
  raw?: string;
  constructor(message: string, code: NotesError["code"] = "invalid", raw?: string) {
    super(message);
    this.name = "NotesError";
    this.code = code;
    this.raw = raw;
  }
}
function validTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 8_640_000_000_000_000
  );
}
export function validateNotesDocument(value: unknown): NotesDocument {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    (value.version !== 1 && value.version !== NOTES_VERSION) ||
    !("notes" in value) ||
    !Array.isArray(value.notes)
  )
    throw new NotesError("Expected a version 1 or 2 Notes export with a notes array.");
  if (value.notes.length > NOTES_LIMITS.count)
    throw new NotesError(`A collection can contain up to ${NOTES_LIMITS.count} notes.`);
  const ids = new Set<string>();
  const notes = value.notes.map((item: unknown, index): Note => {
    if (!item || typeof item !== "object")
      throw new NotesError(`Note ${index + 1} is not a valid note.`);
    const n = item as Record<string, unknown>;
    if (
      typeof n.id !== "string" ||
      !n.id.trim() ||
      n.id.length > 128 ||
      ids.has(n.id) ||
      typeof n.title !== "string" ||
      n.title.length > NOTES_LIMITS.title ||
      typeof n.content !== "string" ||
      n.content.length > NOTES_LIMITS.content ||
      typeof n.pinned !== "boolean" ||
      !validTimestamp(n.createdAt) ||
      !validTimestamp(n.updatedAt) ||
      n.updatedAt < n.createdAt
    )
      throw new NotesError(
        `Note ${index + 1} has invalid fields, duplicate IDs, or timestamps. Titles allow 200 characters; content allows 100,000.`
      );
    let richText: NoteRichDocument | undefined;
    if (n.richText !== undefined) {
      if (value.version !== 2)
        throw new NotesError("Formatted notes require schema version 2.");
      try {
        richText = validateRichDocument(n.richText);
      } catch (error) {
        throw new NotesError(
          error instanceof Error ? error.message : "Invalid formatted note."
        );
      }
      if (richTextToPlainText(richText) !== n.content)
        throw new NotesError(`Note ${index + 1} has mismatched text and formatting.`);
    }
    ids.add(n.id);
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      pinned: n.pinned,
      ...(richText ? { richText } : {}),
    };
  });
  return { version: NOTES_VERSION, notes };
}
export function parseNotesDocument(raw: string): NotesDocument {
  if (new TextEncoder().encode(raw).byteLength > NOTES_LIMITS.fileBytes)
    throw new NotesError("Notes data exceeds the 5 MB limit.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new NotesError("This is not valid JSON. Choose a Notes JSON export.");
  }
  return validateNotesDocument(value);
}
export function serializeNotes(notes: Note[]) {
  const raw = JSON.stringify(validateNotesDocument({ version: NOTES_VERSION, notes }));
  if (new TextEncoder().encode(raw).byteLength > NOTES_LIMITS.fileBytes)
    throw new NotesError(
      "This collection exceeds 5 MB. Export a backup, then shorten or remove some notes."
    );
  return raw;
}
export function createNote(now = Date.now(), id: string = crypto.randomUUID()): Note {
  return { id, title: "", content: "", createdAt: now, updatedAt: now, pinned: false };
}
export function addNote(notes: Note[], note: Note): Note[] {
  if (notes.length >= NOTES_LIMITS.count)
    throw new NotesError(
      "You have reached the 500-note limit. Export a backup and remove a note first."
    );
  return [note, ...notes];
}
export function updateNote(
  notes: Note[],
  id: string,
  changes: Pick<Note, "title" | "content"> & { richText?: NoteRichDocument },
  now = Date.now()
): Note[] {
  const note = notes.find((n) => n.id === id);
  if (!note) return notes;
  const richText =
    changes.richText ?? (note.content === changes.content ? note.richText : undefined);
  if (
    note.title === changes.title &&
    note.content === changes.content &&
    JSON.stringify(note.richText) === JSON.stringify(richText)
  )
    return notes;
  return notes.map((n) =>
    n.id === id
      ? { ...n, ...changes, richText, updatedAt: Math.max(now, n.createdAt, n.updatedAt) }
      : n
  );
}
export function pinNote(notes: Note[], id: string): Note[] {
  return notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
}
export function deleteNote(notes: Note[], id: string): Note[] {
  return notes.filter((n) => n.id !== id);
}
export function duplicateNote(
  notes: Note[],
  id: string,
  now = Date.now(),
  newId: string = crypto.randomUUID()
): Note[] {
  const note = notes.find((n) => n.id === id);
  if (!note) return notes;
  return addNote(notes, {
    ...createNote(now, newId),
    title: `${note.title || "Untitled note"} (copy)`.slice(0, NOTES_LIMITS.title),
    content: note.content,
    ...(note.richText ? { richText: structuredClone(note.richText) } : {}),
  });
}
export function searchNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLocaleLowerCase();
  return notes
    .filter((n) => `${n.title}\n${n.content}`.toLocaleLowerCase().includes(q))
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt - a.updatedAt ||
        a.id.localeCompare(b.id)
    );
}
export function importNotes(
  existing: Note[],
  incoming: Note[],
  mode: ImportMode,
  idFactory: () => string = () => crypto.randomUUID()
): Note[] {
  const validated = validateNotesDocument({
    version: NOTES_VERSION,
    notes: incoming,
  }).notes;
  let result: Note[];
  if (mode === "replace") result = validated;
  else if (mode === "merge") {
    const merged = new Map(existing.map((n) => [n.id, n]));
    for (const note of validated) merged.set(note.id, note);
    result = [...merged.values()];
  } else if (mode === "copies")
    result = [...existing, ...validated.map((n) => ({ ...n, id: idFactory() }))];
  else throw new NotesError("Choose an import mode.");
  return validateNotesDocument({ version: NOTES_VERSION, notes: result }).notes;
}
export interface NotesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function storageError(error: unknown): NotesError {
  const quota =
    error instanceof Error &&
    ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(error.name);
  return new NotesError(
    quota
      ? "Browser storage is full. Changes are not saved. Export a backup, then remove some notes or free browser storage."
      : "Browser storage is unavailable. Changes are not saved. Allow site storage or export your notes before leaving.",
    quota ? "quota" : "storage"
  );
}
export function loadNotes(storage: NotesStorage): { notes: Note[]; raw: string | null } {
  let raw: string | null;
  try {
    raw = storage.getItem(NOTES_STORAGE_KEY);
  } catch (error) {
    throw storageError(error);
  }
  if (raw === null) return { notes: [], raw: null };
  try {
    return { notes: parseNotesDocument(raw).notes, raw };
  } catch (error) {
    throw new NotesError(
      `Stored notes could not be opened. ${error instanceof Error ? error.message : "Invalid data."} Existing data has not been changed.`,
      "invalid",
      raw
    );
  }
}
export function persistNotes(
  storage: NotesStorage,
  notes: Note[],
  expectedRaw: string | null
): string {
  const raw = serializeNotes(notes);
  try {
    const current = storage.getItem(NOTES_STORAGE_KEY);
    if (current !== expectedRaw)
      throw new NotesError(
        "Notes changed in another tab. Load that version, or explicitly keep this tab’s version.",
        "conflict"
      );
    if (raw !== current) storage.setItem(NOTES_STORAGE_KEY, raw);
    return raw;
  } catch (error) {
    if (error instanceof NotesError) throw error;
    throw storageError(error);
  }
}
export function formatNoteTime(timestamp: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

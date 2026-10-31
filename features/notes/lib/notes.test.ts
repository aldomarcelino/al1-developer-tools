import {
  plainTextToRichDocument,
  richTextToPlainText,
  validateRichDocument,
} from "./note-rich-text.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  addNote,
  createNote,
  deleteNote,
  duplicateNote,
  importNotes,
  loadNotes,
  NOTES_STORAGE_KEY,
  NotesError,
  parseNotesDocument,
  persistNotes,
  pinNote,
  searchNotes,
  serializeNotes,
  updateNote,
  type NotesStorage,
} from "./notes.ts";
function memory(initial: string | null = null) {
  let value = initial;
  let writes = 0;
  return {
    get value() {
      return value;
    },
    get writes() {
      return writes;
    },
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
      writes++;
    },
  };
}
const note = () => createNote(1_700_000_000_000, "note-a");
test("notes CRUD creates independent copies and removes by ID", () => {
  const first = { ...note(), title: "Build notes", content: "const a = 1" };
  const notes = addNote([], first);
  const copy = duplicateNote(notes, first.id, first.createdAt + 2000, "copy-a");
  assert.equal(copy.length, 2);
  assert.equal(copy[0].title, "Build notes (copy)");
  assert.equal(copy[0].content, first.content);
  assert.equal(copy[0].createdAt, first.createdAt + 2000);
  assert.equal(copy[0].updatedAt, copy[0].createdAt);
  assert.equal(copy[0].pinned, false);
  assert.deepEqual(deleteNote(copy, "note-a"), [copy[0]]);
  assert.equal(notes[0], first);
});
test("title or content edits update timestamp; identical edits and pinning do not", () => {
  const notes = [note()];
  assert.equal(
    updateNote(notes, "note-a", { title: "", content: "" }, notes[0].createdAt + 100),
    notes
  );
  const changed = updateNote(
    notes,
    "note-a",
    { title: "hello", content: "" },
    notes[0].createdAt + 100
  );
  assert.equal(changed[0].updatedAt, notes[0].createdAt + 100);
  const edited = updateNote(
    changed,
    "note-a",
    { title: "hello", content: "world" },
    notes[0].createdAt + 200
  );
  assert.equal(edited[0].updatedAt, notes[0].createdAt + 200);
  assert.equal(pinNote(edited, "note-a")[0].updatedAt, edited[0].updatedAt);
  assert.equal(pinNote(edited, "note-a")[0].pinned, true);
});
test("clock moving backwards cannot move updatedAt before createdAt", () => {
  const n = note();
  assert.equal(
    updateNote([n], n.id, { title: "test", content: "" }, 1)[0].updatedAt,
    n.createdAt
  );
});
test("search checks title and content; pinned notes sort before recency", () => {
  const base = note();
  const notes = [
    { ...base, id: "one", title: "Fetch API", updatedAt: base.updatedAt + 200 },
    { ...base, id: "two", content: "fetch helper", pinned: true },
    { ...base, id: "three", title: "SQL", updatedAt: base.updatedAt + 300 },
  ];
  assert.deepEqual(
    searchNotes(notes, " FETCH ").map((n) => n.id),
    ["two", "one"]
  );
  assert.deepEqual(
    searchNotes(notes, "").map((n) => n.id),
    ["two", "three", "one"]
  );
  assert.deepEqual(searchNotes(notes, "missing"), []);
  assert.equal(notes[0].id, "one");
});
test("versioned export round-trips Unicode, newlines, and exact timestamps", () => {
  const notes = [{ ...note(), title: "日本語", content: "<script>hello</script>\n🚀" }];
  assert.deepEqual(parseNotesDocument(serializeNotes(notes)), { version: 2, notes });
});
test("import rejects malformed JSON, unknown versions, invalid shapes, duplicate IDs, bad dates and limits", () => {
  const n = note();
  for (const raw of [
    "",
    "{",
    "null",
    "[]",
    JSON.stringify({ version: 99, notes: [] }),
    JSON.stringify({ version: 1, notes: [n, n] }),
    JSON.stringify({ version: 1, notes: [{ ...n, pinned: "yes" }] }),
    JSON.stringify({ version: 1, notes: [{ ...n, createdAt: -1 }] }),
    JSON.stringify({ version: 1, notes: [{ ...n, updatedAt: n.createdAt - 1 }] }),
    JSON.stringify({ version: 1, notes: [{ ...n, title: "a".repeat(201) }] }),
    JSON.stringify({ version: 1, notes: [{ ...n, content: "a".repeat(100001) }] }),
  ])
    assert.throws(() => parseNotesDocument(raw), NotesError);
});
test("copy import never overwrites existing IDs; merge and replace are explicit", () => {
  const existing = [{ ...note(), title: "original" }];
  const incoming = [{ ...note(), title: "imported" }];
  const copies = importNotes(existing, incoming, "copies", () => "new-id");
  assert.equal(copies[0].title, "original");
  assert.equal(copies[1].id, "new-id");
  assert.equal(copies[1].title, "imported");
  assert.deepEqual(importNotes(existing, incoming, "merge"), incoming);
  assert.deepEqual(importNotes(existing, [], "replace"), []);
  assert.equal(existing[0].title, "original");
});
test("empty storage does not write; unchanged serialization is never rewritten", () => {
  const storage = memory();
  assert.deepEqual(loadNotes(storage), { notes: [], raw: null });
  assert.equal(storage.writes, 0);
  const raw = persistNotes(storage, [note()], null);
  assert.equal(storage.writes, 1);
  persistNotes(storage, [note()], raw);
  assert.equal(storage.writes, 1);
  assert.equal(storage.value, raw);
});
test("malformed stored JSON is retained for recovery, never overwritten on load", () => {
  const storage = memory("{bad json");
  assert.throws(
    () => loadNotes(storage),
    (error: unknown) =>
      error instanceof NotesError && error.code === "invalid" && error.raw === "{bad json"
  );
  assert.equal(storage.value, "{bad json");
  assert.equal(storage.writes, 0);
});
test("read access errors and denied writes return actionable storage errors", () => {
  const denied: NotesStorage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  };
  assert.throws(
    () => loadNotes(denied),
    (error: unknown) => error instanceof NotesError && error.code === "storage"
  );
  assert.throws(
    () => persistNotes({ ...denied, getItem: () => null }, [note()], null),
    (error: unknown) =>
      error instanceof NotesError &&
      error.code === "storage" &&
      error.message.includes("not saved")
  );
});
test("quota failure preserves old stored data and never reports a successful write", () => {
  const old = serializeNotes([note()]);
  const stored = old;
  const storage: NotesStorage = {
    getItem: () => stored,
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
  };
  assert.throws(
    () => persistNotes(storage, [{ ...note(), title: "not saved" }], old),
    (error: unknown) =>
      error instanceof NotesError &&
      error.code === "quota" &&
      error.message.includes("not saved")
  );
  assert.equal(stored, old);
});
test("external changes are detected before overwriting another tab", () => {
  const storage = memory(serializeNotes([{ ...note(), title: "other tab" }]));
  assert.throws(
    () => persistNotes(storage, [note()], null),
    (error: unknown) => error instanceof NotesError && error.code === "conflict"
  );
  assert.equal(storage.writes, 0);
  assert.equal(NOTES_STORAGE_KEY, "al1-local-notes");
});

test("legacy notes open without writes or timestamp changes and export as version 2", () => {
  const original = {
    ...note(),
    content: "Meeting\n\n日本語 <script>literal text</script>",
  };
  const storage = memory(JSON.stringify({ version: 1, notes: [original] }));
  const loaded = loadNotes(storage);
  assert.deepEqual(loaded.notes, [original]);
  assert.equal(storage.writes, 0);
  assert.deepEqual(parseNotesDocument(serializeNotes(loaded.notes)), {
    version: 2,
    notes: [original],
  });
  assert.equal(
    richTextToPlainText(plainTextToRichDocument(original.content)),
    original.content
  );
});

const formatted = () =>
  validateRichDocument({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "Product sync",
            marks: [{ type: "bold" }, { type: "italic" }],
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Review designs" }] },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: { language: null },
        content: [{ type: "text", text: "const ready = true;" }],
      },
    ],
  });
test("rich notes retain headings, marks, code and checklist state through export, copy and import", () => {
  const richText = formatted();
  const n = { ...note(), richText, content: richTextToPlainText(richText) };
  assert.equal(n.content, "Product sync\nReview designs\nconst ready = true;");
  assert.deepEqual(parseNotesDocument(serializeNotes([n])).notes, [n]);
  const copied = duplicateNote([n], n.id, n.updatedAt + 10, "rich-copy")[0];
  assert.deepEqual(copied.richText, richText);
  assert.notEqual(copied.richText, richText);
  assert.deepEqual(
    importNotes([], [n], "copies", () => "imported")[0].richText,
    richText
  );
  assert.equal(searchNotes([n], "review designs")[0].id, n.id);
});
test("format-only edits change updatedAt once; repeated edits and title changes retain formatting", () => {
  const richText = plainTextToRichDocument("Hello");
  const n = { ...note(), content: "Hello", richText };
  const bold = validateRichDocument({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
      },
    ],
  });
  const changed = updateNote(
    [n],
    n.id,
    { title: "", content: "Hello", richText: bold },
    n.updatedAt + 100
  );
  assert.equal(changed[0].updatedAt, n.updatedAt + 100);
  assert.equal(
    updateNote(
      changed,
      n.id,
      { title: "", content: "Hello", richText: structuredClone(bold) },
      n.updatedAt + 200
    ),
    changed
  );
  assert.deepEqual(
    updateNote(
      changed,
      n.id,
      { title: "New title", content: "Hello" },
      n.updatedAt + 300
    )[0].richText,
    bold
  );
});
test("rich import rejects unsupported HTML, links, attributes, headings and mismatched plaintext", () => {
  const invalidDocuments = [
    { type: "doc", content: [{ type: "script", text: "alert(1)" }] },
    { type: "doc", content: [{ type: "paragraph", attrs: { onclick: "alert(1)" } }] },
    { type: "doc", content: [{ type: "heading", attrs: { level: 6 } }] },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    },
    {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: "yes" },
              content: [{ type: "paragraph" }],
            },
          ],
        },
      ],
    },
  ];
  for (const richText of invalidDocuments) {
    assert.throws(() => validateRichDocument(richText));
    assert.throws(
      () =>
        parseNotesDocument(
          JSON.stringify({ version: 2, notes: [{ ...note(), richText }] })
        ),
      NotesError
    );
  }
  assert.throws(
    () =>
      parseNotesDocument(
        JSON.stringify({
          version: 2,
          notes: [{ ...note(), richText: formatted(), content: "wrong text" }],
        })
      ),
    /mismatched/
  );
  assert.throws(
    () =>
      parseNotesDocument(
        JSON.stringify({ version: 1, notes: [{ ...note(), richText: formatted() }] })
      ),
    /schema version 2/
  );
});
test("rich text limits reject deeply nested and oversized notes; plain blank lines round-trip", () => {
  let nested: unknown = { type: "paragraph" };
  for (let i = 0; i < 34; i++) nested = { type: "blockquote", content: [nested] };
  assert.throws(
    () => validateRichDocument({ type: "doc", content: [nested] }),
    /complex/
  );
  assert.throws(
    () => validateRichDocument(plainTextToRichDocument("x".repeat(100001))),
    /too large/
  );
  for (const text of ["", "\n\n", "one\n\ntwo\n", "line\n".repeat(2500)])
    assert.equal(
      richTextToPlainText(validateRichDocument(plainTextToRichDocument(text))),
      text
    );
});

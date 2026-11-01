/**
 * Replaces spoken punctuation commands with standard punctuation symbols.
 * Supports Indonesian and English dictation commands.
 */
export function applyVoicePunctuation(text: string, enabled: boolean): string {
  if (!enabled || !text) return text;

  let result = text;

  // Patterns for multi-word commands first to prevent partial word collisions
  const multiWordReplacements: [RegExp, string][] = [
    // Indonesian multi-words
    [/\b(paragraf\s+baru|ganti\s+paragraf)\b/gi, "\n\n"],
    [/\b(baris\s+baru|ganti\s+baris)\b/gi, "\n"],
    [/\b(tanda\s+tanya)\b/gi, "?"],
    [/\b(tanda\s+seru)\b/gi, "!"],
    [/\b(titik\s+dua)\b/gi, ":"],
    [/\b(titik\s+koma)\b/gi, ";"],
    [/\b(buka\s+kurung|tanda\s+kurung\s+buka)\b/gi, " ("],
    [/\b(tutup\s+kurung|tanda\s+kurung\s+tutup)\b/gi, ") "],
    [/\b(tanda\s+petik)\b/gi, '"'],

    // English multi-words
    [/\b(new\s+paragraph)\b/gi, "\n\n"],
    [/\b(new\s+line|line\s+break)\b/gi, "\n"],
    [/\b(question\s+mark)\b/gi, "?"],
    [/\b(exclamation\s+mark|exclamation\s+point)\b/gi, "!"],
    [/\b(full\s+stop)\b/gi, "."],
    [/\b(open\s+parenthesis|open\s+bracket)\b/gi, " ("],
    [/\b(close\s+parenthesis|close\s+bracket)\b/gi, ") "],
    [/\b(quotation\s+mark)\b/gi, '"'],
  ];

  for (const [regex, replacement] of multiWordReplacements) {
    result = result.replace(regex, replacement);
  }

  // Single word commands
  const singleWordReplacements: [RegExp, string][] = [
    // Indonesian
    [/\b(titik)\b/gi, "."],
    [/\b(koma)\b/gi, ","],
    [/\b(enter)\b/gi, "\n"],

    // English
    [/\b(period|dot)\b/gi, "."],
    [/\b(comma)\b/gi, ","],
    [/\b(colon)\b/gi, ":"],
    [/\b(semicolon)\b/gi, ";"],
  ];

  for (const [regex, replacement] of singleWordReplacements) {
    result = result.replace(regex, replacement);
  }

  // Formatting cleanup:
  // 1. Remove spaces immediately before ., ?, !, :, ;, )
  result = result.replace(/\s+([.,?!:;)])/g, "$1");

  // 2. Remove spaces immediately after (
  result = result.replace(/([(])\s+/g, "$1");

  // 3. Ensure a space after punctuation if immediately followed by an alphanumeric character
  result = result.replace(/([.,?!:;])([A-Za-z0-9])/g, "$1 $2");

  // 4. Clean whitespace before and after line breaks
  result = result.replace(/[ \t]*\n[ \t]*/g, "\n");

  return result;
}

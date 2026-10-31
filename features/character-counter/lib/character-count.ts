const characterSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const wordSegmenter = new Intl.Segmenter("en", { granularity: "word" });
const encoder = new TextEncoder();

export function countText(text: string) {
  let characters = 0;
  let withoutWhitespace = 0;
  let words = 0;
  for (const { segment } of characterSegmenter.segment(text)) {
    characters++;
    if (!/^\s+$/u.test(segment)) withoutWhitespace++;
  }
  for (const part of wordSegmenter.segment(text)) {
    if (part.isWordLike) words++;
  }
  return {
    characters,
    withoutWhitespace,
    words,
    lines: text.length ? text.split(/\r\n|\r|\n/).length : 0,
    bytes: encoder.encode(text).length,
    codePoints: [...text].length,
    codeUnits: text.length,
  };
}

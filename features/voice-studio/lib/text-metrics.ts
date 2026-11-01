export interface TextMetrics {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  estimatedSeconds: number;
  formattedSpeakingTime: string;
}

/**
 * Calculates live text statistics and speaking time estimates.
 * Average human speaking rate is approximately 130–150 words per minute (~2.3 words/sec).
 */
export function calculateTextMetrics(text: string): TextMetrics {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s+/g, "").length;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  // Split on sentence-ending punctuation or non-empty newlines
  const sentences = trimmed
    ? trimmed
        .split(/[.!?]+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean).length
    : 0;

  const paragraphs = trimmed
    ? trimmed
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean).length
    : 0;

  const estimatedSeconds = Math.ceil(words / 2.3);

  let formattedSpeakingTime = "0 sec";
  if (estimatedSeconds > 0) {
    if (estimatedSeconds < 60) {
      formattedSpeakingTime = `${estimatedSeconds} sec`;
    } else {
      const mins = Math.floor(estimatedSeconds / 60);
      const remSecs = estimatedSeconds % 60;
      formattedSpeakingTime = remSecs > 0 ? `${mins} min ${remSecs} sec` : `${mins} min`;
    }
  }

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    estimatedSeconds,
    formattedSpeakingTime,
  };
}

/**
 * Transforms string casing: UPPERCASE, lowercase, or Title Case.
 */
export function transformCase(text: string, style: "upper" | "lower" | "title"): string {
  if (!text) return "";
  switch (style) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text
        .toLowerCase()
        .replace(
          /(^|[^\p{L}\p{N}])(\p{L})/gu,
          (_, prefix: string, letter: string) => prefix + letter.toUpperCase()
        );
  }
}

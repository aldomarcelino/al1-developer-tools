export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: "id-ID", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  {
    code: "en-US",
    name: "English (US)",
    nativeName: "English (United States)",
    flag: "🇺🇸",
  },
  {
    code: "en-GB",
    name: "English (UK)",
    nativeName: "English (United Kingdom)",
    flag: "🇬🇧",
  },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Mandarin)", nativeName: "中文 (简体)", flag: "🇨🇳" },
  { code: "es-ES", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de-DE", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ar-SA", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "pt-BR", name: "Portuguese", nativeName: "Português (Brasil)", flag: "🇧🇷" },
  { code: "ru-RU", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "it-IT", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "nl-NL", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "tr-TR", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th-TH", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
];

export function getLanguageByCode(code: string): LanguageOption {
  const found = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === code.toLowerCase()
  );
  return found || SUPPORTED_LANGUAGES[0];
}

/** Filter synthesis voices matching a target language prefix (e.g. "id" or "id-ID") */
export function filterVoicesByLanguage(
  voices: readonly SpeechSynthesisVoice[],
  langCode: string
): SpeechSynthesisVoice[] {
  if (!voices || voices.length === 0) return [];
  const primaryTag = langCode.split("-")[0].toLowerCase();

  // First priority: exact match
  const exact = voices.filter((v) => v.lang.toLowerCase() === langCode.toLowerCase());
  if (exact.length > 0) return exact;

  // Second priority: primary tag match (e.g. en for en-US/en-GB)
  const tagMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(primaryTag));
  if (tagMatches.length > 0) return tagMatches;

  // Fallback: all voices
  return [...voices];
}

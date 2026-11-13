import test from "node:test";
import assert from "node:assert/strict";
import { applyVoicePunctuation } from "./voice-punctuation.ts";
import { calculateTextMetrics, transformCase } from "./text-metrics.ts";
import { filterVoicesByLanguage, SUPPORTED_LANGUAGES } from "./voice-languages.ts";
import { tools } from "../../../config/tools.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("applyVoicePunctuation converts Indonesian speech commands to punctuation", () => {
  const input = "halo titik apa kabar tanda tanya saya sehat koma terima kasih";
  const result = applyVoicePunctuation(input, true);
  assert.equal(result, "halo. apa kabar? saya sehat, terima kasih");
});

test("applyVoicePunctuation converts English speech commands and handles line breaks", () => {
  const input =
    "hello world comma this is dictation period new line next line exclamation mark";
  const result = applyVoicePunctuation(input, true);
  assert.equal(result, "hello world, this is dictation.\nnext line!");
});

test("applyVoicePunctuation returns original text when disabled", () => {
  const input = "kata titik tetap titik";
  assert.equal(applyVoicePunctuation(input, false), "kata titik tetap titik");
});

test("calculateTextMetrics accurately computes characters, words, sentences, and estimated time", () => {
  const text = "Selamat datang di Ramupod. Ini adalah kalimat kedua! Dan kalimat ketiga?";
  const stats = calculateTextMetrics(text);
  assert.equal(stats.characters, text.length);
  assert.equal(stats.words, 11);
  assert.equal(stats.sentences, 3);
  assert.ok(stats.estimatedSeconds > 0);
  assert.ok(stats.formattedSpeakingTime.includes("sec"));
});

test("transformCase correctly handles upper, lower, and Unicode title case", () => {
  const sample = "halo dunia ramupod";
  assert.equal(transformCase(sample, "upper"), "HALO DUNIA RAMUPOD");
  assert.equal(transformCase("HALO DUNIA", "lower"), "halo dunia");
  assert.equal(
    transformCase("halo dunia dan ramupod", "title"),
    "Halo Dunia Dan Ramupod"
  );
});

test("filterVoicesByLanguage matches exact and prefix language codes with fallback", () => {
  assert.ok(SUPPORTED_LANGUAGES.length > 0);
  const fakeVoices = [
    { name: "Google Indonesian", lang: "id-ID" },
    { name: "Google US English", lang: "en-US" },
    { name: "Google UK English", lang: "en-GB" },
    { name: "Google Japanese", lang: "ja-JP" },
  ] as unknown as SpeechSynthesisVoice[];

  const idMatches = filterVoicesByLanguage(fakeVoices, "id-ID");
  assert.equal(idMatches.length, 1);
  assert.equal(idMatches[0].name, "Google Indonesian");

  const enMatches = filterVoicesByLanguage(fakeVoices, "en-US");
  assert.equal(enMatches.length, 1);
  assert.equal(enMatches[0].name, "Google US English");

  const fallback = filterVoicesByLanguage(fakeVoices, "xx-XX");
  assert.equal(fallback.length, 4);
});

test("speech-to-text and text-to-speech are properly registered in tools catalog and SEO", () => {
  const stt = tools.find((t) => t.slug === "speech-to-text");
  const tts = tools.find((t) => t.slug === "text-to-speech");

  assert.ok(stt, "speech-to-text tool must be present in tools catalog");
  assert.ok(tts, "text-to-speech tool must be present in tools catalog");

  assert.equal(stt.icon, "mic");
  assert.equal(tts.icon, "volume");

  assert.equal(stt.status, "available");
  assert.equal(tts.status, "available");

  assert.ok(toolSeo["speech-to-text"]);
  assert.ok(toolSeo["text-to-speech"]);

  assert.ok(toolSeo["speech-to-text"].title.includes("Speech to Text"));
  assert.ok(toolSeo["text-to-speech"].title.includes("Text to Speech"));
});

test("microphone permission helpers handle missing and mocked environments gracefully", async () => {
  const { checkMicrophonePermission, requestMicrophoneAccess } =
    await import("./speech-recognition.ts");

  // In default Node environment without navigator.permissions
  const perm = await checkMicrophonePermission();
  assert.equal(perm, "unsupported");

  const mic = await requestMicrophoneAccess();
  assert.equal(mic.ok, true);
});

const classic = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
const sentences = [
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Integer feugiat scelerisque varius morbi enim nunc faucibus.",
  "Amet facilisis magna etiam tempor orci eu lobortis elementum nibh.",
  "Felis donec et odio pellentesque diam volutpat commodo sed egestas.",
  "Nunc eget lorem dolor sed viverra ipsum nunc aliquet bibendum.",
];

export const defaultAmount = 3;
// Keep the initial preview identical on the server and in the browser.
export const sampleText = Array.from({ length: defaultAmount }, (_, paragraph) =>
  Array.from({ length: 4 }, (_, index) => {
    const position = paragraph * 4 + index;
    return position === 0 ? classic : sentences[(position - 1) % sentences.length];
  }).join(" ")
).join("\n\n");

export const limits = { paragraphs: 30, sentences: 100, words: 1000 } as const;
export type Unit = keyof typeof limits;

export function generateLoremIpsum(unit: Unit, count: number, classicStart: boolean) {
  const nextSentence = (index: number) =>
    classicStart && index === 0
      ? classic
      : sentences[Math.floor(Math.random() * sentences.length)];

  if (unit === "words") {
    const words: string[] = [];
    for (let i = 0; words.length < count; i++) {
      words.push(...nextSentence(i).split(" "));
    }
    return words.slice(0, count).join(" ");
  }

  if (unit === "sentences") {
    return Array.from({ length: count }, (_, index) => nextSentence(index)).join(" ");
  }

  return Array.from({ length: count }, (_, paragraph) =>
    Array.from({ length: 4 }, (_, index) => nextSentence(paragraph * 4 + index)).join(" ")
  ).join("\n\n");
}

import { testRegex, type RegexFlags } from "./regex.ts";

export type RegexRequest = {
  pattern: string;
  flags: RegexFlags;
  testString: string;
  replacement: string;
};

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  const { pattern, flags, testString, replacement } = event.data;
  self.postMessage(testRegex(pattern, flags, testString, replacement));
};

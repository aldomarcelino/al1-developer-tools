/**
 * Base64, Base64URL, URL (Percent), and Hex Encoder/Decoder Library
 * Robust handling of UTF-8 strings (including emojis and multi-byte characters)
 */

export type EncodingMode = "base64" | "base64url" | "url" | "hex";
export type EncodingDirection = "encode" | "decode";

export interface EncodeOptions {
  lineByLine?: boolean;
  stripPadding?: boolean; // Base64 & Base64URL only
  encodeAllCharacters?: boolean; // URL mode: encodeURI vs encodeURIComponent
}

export interface EncodeResult {
  output: string;
  success: boolean;
  error?: string;
  inputBytes: number;
  outputBytes: number;
}

// UTF-8 safe text to binary string conversion
function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// Standard Base64 Encode (UTF-8 safe)
export function encodeBase64(input: string, stripPadding = false): string {
  const bytes = utf8ToBytes(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let encoded = btoa(binary);
  if (stripPadding) {
    encoded = encoded.replace(/=+$/, "");
  }
  return encoded;
}

// Standard Base64 Decode (UTF-8 safe)
export function decodeBase64(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, "");
  // Pad if missing
  let padded = cleaned;
  while (padded.length % 4 !== 0) {
    padded += "=";
  }

  // Validate base64 characters
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) {
    throw new Error("Invalid Base64 sequence: string contains invalid characters.");
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytesToUtf8(bytes);
}

// Base64URL Encode (RFC 4648 §5)
export function encodeBase64Url(input: string, stripPadding = true): string {
  let b64 = encodeBase64(input, false);
  let b64url = b64.replace(/\+/g, "-").replace(/\//g, "_");
  if (stripPadding) {
    b64url = b64url.replace(/=+$/, "");
  }
  return b64url;
}

// Base64URL Decode (RFC 4648 §5)
export function decodeBase64Url(input: string): string {
  let b64 = input.trim().replace(/-/g, "+").replace(/_/g, "/");
  return decodeBase64(b64);
}

// URL Percent Encode
export function encodeUrl(input: string, encodeAll = true): string {
  return encodeAll ? encodeURIComponent(input) : encodeURI(input);
}

// URL Percent Decode
export function decodeUrl(input: string): string {
  return decodeURIComponent(input);
}

// Hexadecimal Encode
export function encodeHex(input: string): string {
  const bytes = utf8ToBytes(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Hexadecimal Decode
export function decodeHex(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, "");
  if (cleaned.length % 2 !== 0) {
    throw new Error("Invalid Hex sequence: length must be an even number of characters.");
  }
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error("Invalid Hex sequence: contains non-hexadecimal characters.");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return bytesToUtf8(bytes);
}

// Unified Processor supporting line-by-line option
export function processEncoding(
  input: string,
  mode: EncodingMode,
  direction: EncodingDirection,
  options: EncodeOptions = {}
): EncodeResult {
  const inputBytes = new TextEncoder().encode(input).length;
  if (!input) {
    return { output: "", success: true, inputBytes: 0, outputBytes: 0 };
  }

  const {
    lineByLine = false,
    stripPadding = false,
    encodeAllCharacters = true,
  } = options;

  const processChunk = (chunk: string): string => {
    if (direction === "encode") {
      switch (mode) {
        case "base64":
          return encodeBase64(chunk, stripPadding);
        case "base64url":
          return encodeBase64Url(chunk, stripPadding);
        case "url":
          return encodeUrl(chunk, encodeAllCharacters);
        case "hex":
          return encodeHex(chunk);
      }
    } else {
      switch (mode) {
        case "base64":
          return decodeBase64(chunk);
        case "base64url":
          return decodeBase64Url(chunk);
        case "url":
          return decodeUrl(chunk);
        case "hex":
          return decodeHex(chunk);
      }
    }
  };

  try {
    let result = "";
    if (lineByLine) {
      const lines = input.split("\n");
      result = lines.map((l) => (l === "" ? "" : processChunk(l))).join("\n");
    } else {
      result = processChunk(input);
    }

    const outputBytes = new TextEncoder().encode(result).length;
    return {
      output: result,
      success: true,
      inputBytes,
      outputBytes,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process data.";
    return {
      output: "",
      success: false,
      error: message,
      inputBytes,
      outputBytes: 0,
    };
  }
}

// Sample Data presets
export const sampleBase64Plain = `Developer Tools & Utilities 🚀
Built for speed, clean UX, and 100% client-side privacy.
JSON Formatter, Markdown Editor, Diff Viewer & JWT Decoder.`;

export const sampleBase64Encoded = `RGV2ZWxvcGVyIFRvb2xzICYgVXRpbGl0aWVzIPCfmYAKQnVpbHQgZm9yIHNwZWVkLCBjbGVhbiBVWCwgYW5kIDEwMCU client-side privacyLgpKU09OIEZvcm1hdHRlciwgTWFya2Rvd24gRWRpdG9yLCBEaWZmIFZpZXdlciAmIEpXVCBEZWNvZGVyLg==`;

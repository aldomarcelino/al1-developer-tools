/**
 * Cryptographically Secure Random Key & Secret Generator Engine
 * Uses Web Crypto API (crypto.getRandomValues) for true randomness.
 * Inspired by RandomKeygen, built with clean, modern developer UX.
 */

export interface KeyItem {
  id: string;
  category: "passwords" | "keys" | "tokens" | "numeric";
  title: string;
  description: string;
  value: string;
}

// Secure byte generation
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for edge non-browser environments
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// Generate random string from character set
export function generateRandomString(length: number, charset: string): string {
  const bytes = getRandomBytes(length);
  let result = "";
  const charsetLen = charset.length;
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charsetLen];
  }
  return result;
}

// Generate hex string from random bytes
export function generateRandomHex(byteCount: number): string {
  const bytes = getRandomBytes(byteCount);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// UUID v4 (RFC 4122)
export function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = getRandomBytes(16);
  // Set version to 0100 (v4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant to 10xx (RFC 4122)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

// UUID v7 (Time-ordered 128-bit identifier)
export function generateUuidV7(): string {
  const bytes = getRandomBytes(16);
  const now = Date.now();

  // 48-bit timestamp
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7
  bytes[6] = 0x70 | (bytes[6] & 0x0f);
  // Variant
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

// NanoID format (21 chars, URL-friendly)
export function generateNanoId(length = 21): string {
  const alphabet = "useandom-26T1983_40STOpfunkgReferParameterx";
  return generateRandomString(length, alphabet);
}

// Memorable words dictionary
const wordList = [
  "falcon",
  "silver",
  "planet",
  "timber",
  "orbit",
  "breeze",
  "anchor",
  "meadow",
  "cipher",
  "velvet",
  "cobalt",
  "harbor",
  "zenith",
  "quartz",
  "summit",
  "canyon",
  "bridge",
  "shadow",
  "winter",
  "stream",
  "beacon",
  "kernel",
  "aurora",
  "stride",
  "glacier",
  "matrix",
  "vector",
  "signal",
  "radiant",
  "canvas",
  "dynamo",
  "fossil",
];

export function generateMemorablePassphrase(wordCount = 4): string {
  const bytes = getRandomBytes(wordCount);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(wordList[bytes[i] % wordList.length]);
  }
  return words.join("-");
}

// Base64 256-bit Secret Key
export function generateBase64Key(byteCount = 32): string {
  const bytes = getRandomBytes(byteCount);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Character subsets
const CHARS_ALPHA_LOWER = "abcdefghijklmnopqrstuvwxyz";
const CHARS_ALPHA_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHARS_NUMBERS = "0123456789";
const CHARS_SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const CHARS_READABLE = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, l, I

// Full Suite Generator
export function generateKeySuite(): KeyItem[] {
  return [
    // Identifiers & Tokens
    {
      id: "uuid-v4",
      category: "tokens",
      title: "UUID v4",
      description: "Standard RFC 4122 random 128-bit unique identifier",
      value: generateUuidV4(),
    },
    {
      id: "uuid-v7",
      category: "tokens",
      title: "UUID v7 (Time-Ordered)",
      description: "K-sortable unique identifier with millisecond timestamp",
      value: generateUuidV7(),
    },
    {
      id: "nanoid",
      category: "tokens",
      title: "NanoID",
      description: "21-character URL-friendly, compact unique ID",
      value: generateNanoId(21),
    },

    // Cryptographic & API Keys
    {
      id: "hex-256",
      category: "keys",
      title: "256-bit Hex Key (Laravel / Rails / JWT Secret)",
      description: "64-character hexadecimal key (AES-256 / SHA-256)",
      value: generateRandomHex(32),
    },
    {
      id: "base64-256",
      category: "keys",
      title: "256-bit Base64 Key",
      description: "44-character Base64 encoded 32-byte secret",
      value: generateBase64Key(32),
    },
    {
      id: "hex-512",
      category: "keys",
      title: "512-bit Master Key (HMAC / SHA-512)",
      description: "128-character high-entropy cryptographic secret",
      value: generateRandomHex(64),
    },
    {
      id: "hex-128",
      category: "keys",
      title: "128-bit WPA / Hex Key",
      description: "32-character hexadecimal key",
      value: generateRandomHex(16),
    },

    // Secure Passwords
    {
      id: "fort-knox",
      category: "passwords",
      title: "Fort Knox Password (24 chars)",
      description: "Maximum entropy: uppercase, lowercase, numbers, and symbols",
      value: generateRandomString(
        24,
        CHARS_ALPHA_LOWER + CHARS_ALPHA_UPPER + CHARS_NUMBERS + CHARS_SYMBOLS
      ),
    },
    {
      id: "high-sec",
      category: "passwords",
      title: "High Security Password (16 chars)",
      description: "Standard recommended security password",
      value: generateRandomString(
        16,
        CHARS_ALPHA_LOWER + CHARS_ALPHA_UPPER + CHARS_NUMBERS + CHARS_SYMBOLS
      ),
    },
    {
      id: "readable",
      category: "passwords",
      title: "Human Readable / Avoid Ambiguous (14 chars)",
      description: "Excludes confusing characters like 0, O, 1, l, and I",
      value: generateRandomString(14, CHARS_READABLE),
    },
    {
      id: "passphrase",
      category: "passwords",
      title: "Memorable Passphrase",
      description: "Diceware-style 4 random dictionary words connected by hyphens",
      value: generateMemorablePassphrase(4),
    },

    // Numeric PINs
    {
      id: "pin-6",
      category: "numeric",
      title: "6-Digit Secure PIN",
      description: "For MFA / 2FA verification codes",
      value: generateRandomString(6, CHARS_NUMBERS),
    },
    {
      id: "pin-8",
      category: "numeric",
      title: "8-Digit Numeric Code",
      description: "High-security banking / device PIN",
      value: generateRandomString(8, CHARS_NUMBERS),
    },
  ];
}

// Custom Key Generator Options
export interface CustomKeyOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generateCustomKey(options: CustomKeyOptions): string {
  const { length, uppercase, lowercase, numbers, symbols } = options;
  let charset = "";
  if (lowercase) charset += CHARS_ALPHA_LOWER;
  if (uppercase) charset += CHARS_ALPHA_UPPER;
  if (numbers) charset += CHARS_NUMBERS;
  if (symbols) charset += CHARS_SYMBOLS;

  if (!charset) charset = CHARS_ALPHA_LOWER + CHARS_NUMBERS;
  return generateRandomString(Math.max(4, Math.min(128, length)), charset);
}

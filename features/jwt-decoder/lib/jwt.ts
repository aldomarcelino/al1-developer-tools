/**
 * Lightweight, secure client-side JWT (JSON Web Token) parser and validator.
 * 100% offline and client-side: never transmits tokens to any server.
 */

export interface JwtClaimInfo {
  key: string;
  value: unknown;
  description: string;
  isDate?: boolean;
  dateString?: string;
  relativeTime?: string;
}

export interface JwtTokenInfo {
  raw: string;
  rawHeader: string;
  rawPayload: string;
  rawSignature: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerJson: string;
  payloadJson: string;
  algorithm: string;
  tokenType: string;
  isExpired: boolean;
  isNotYetValid: boolean;
  expiresAt?: Date;
  issuedAt?: Date;
  notBefore?: Date;
  expiresFormatted?: string;
  expiresRelative?: string;
  issuedFormatted?: string;
  notBeforeFormatted?: string;
  claims: JwtClaimInfo[];
  isValidFormat: boolean;
  error?: string;
}

const standardClaimDescriptions: Record<string, string> = {
  iss: "Issuer: Identifies the principal that issued the JWT",
  sub: "Subject: Identifies the principal that is the subject of the JWT",
  aud: "Audience: Identifies the recipients that the JWT is intended for",
  exp: "Expiration Time: Timestamp after which the JWT MUST NOT be accepted",
  nbf: "Not Before: Timestamp before which the JWT MUST NOT be accepted",
  iat: "Issued At: Timestamp when the JWT was created",
  jti: "JWT ID: Unique identifier for the token",
  name: "Full Name of the user",
  email: "Email address of the user",
  email_verified: "Whether the email address has been verified",
  role: "User authorization role",
  roles: "List of user authorization roles",
  scope: "OAuth granted permission scopes",
  preferred_username: "Shorthand name or username",
};

/**
 * Base64Url decode helper for UTF-8 strings.
 */
export function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '='
  while (base64.length % 4) {
    base64 += "=";
  }
  // Decode Base64 string handling UTF-8 characters safely
  try {
    if (typeof atob === "function") {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
    // Node.js fallback
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    throw new Error("Invalid Base64Url encoding");
  }
}

/**
 * Calculates human-readable relative time (e.g. "in 2 hours", "3 days ago").
 */
function getRelativeTime(targetDate: Date, now: Date = new Date()): string {
  const diffSec = Math.round((targetDate.getTime() - now.getTime()) / 1000);
  const isPast = diffSec < 0;
  const absSec = Math.abs(diffSec);

  let str = "";
  if (absSec < 60) {
    str = `${absSec} second${absSec !== 1 ? "s" : ""}`;
  } else if (absSec < 3600) {
    const mins = Math.floor(absSec / 60);
    str = `${mins} minute${mins !== 1 ? "s" : ""}`;
  } else if (absSec < 86400) {
    const hours = Math.floor(absSec / 3600);
    str = `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(absSec / 86400);
    str = `${days} day${days !== 1 ? "s" : ""}`;
  }

  return isPast ? `${str} ago` : `in ${str}`;
}

/**
 * Parses and validates a JWT token.
 */
export function parseJwt(token: string): JwtTokenInfo {
  const cleaned = token.replace(/^Bearer\s+/i, "").trim();

  if (!cleaned) {
    return {
      raw: "",
      rawHeader: "",
      rawPayload: "",
      rawSignature: "",
      header: {},
      payload: {},
      headerJson: "",
      payloadJson: "",
      algorithm: "",
      tokenType: "",
      isExpired: false,
      isNotYetValid: false,
      claims: [],
      isValidFormat: false,
      error: "Please enter or paste a JWT token.",
    };
  }

  const parts = cleaned.split(".");
  if (parts.length !== 3) {
    return {
      raw: cleaned,
      rawHeader: parts[0] || "",
      rawPayload: parts[1] || "",
      rawSignature: parts[2] || "",
      header: {},
      payload: {},
      headerJson: "",
      payloadJson: "",
      algorithm: "",
      tokenType: "",
      isExpired: false,
      isNotYetValid: false,
      claims: [],
      isValidFormat: false,
      error: `Invalid JWT structure: Expected 3 parts separated by dots (header.payload.signature), but found ${parts.length} part${parts.length === 1 ? "" : "s"}.`,
    };
  }

  try {
    const headerStr = base64UrlDecode(parts[0]);
    const payloadStr = base64UrlDecode(parts[1]);

    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);

    const now = new Date();
    let isExpired = false;
    let isNotYetValid = false;
    let expiresAt: Date | undefined;
    let issuedAt: Date | undefined;
    let notBefore: Date | undefined;

    if (typeof payload.exp === "number") {
      expiresAt = new Date(payload.exp * 1000);
      isExpired = expiresAt.getTime() <= now.getTime();
    }

    if (typeof payload.nbf === "number") {
      notBefore = new Date(payload.nbf * 1000);
      isNotYetValid = notBefore.getTime() > now.getTime();
    }

    if (typeof payload.iat === "number") {
      issuedAt = new Date(payload.iat * 1000);
    }

    // Build structured claims list
    const claims: JwtClaimInfo[] = Object.keys(payload).map((k) => {
      const val = payload[k];
      const desc =
        standardClaimDescriptions[k] ||
        (typeof val === "object" ? "Custom nested object payload" : "Custom token claim");

      if (k === "exp" && expiresAt) {
        return {
          key: k,
          value: val,
          description: desc,
          isDate: true,
          dateString: expiresAt.toUTCString(),
          relativeTime: getRelativeTime(expiresAt, now),
        };
      }
      if (k === "iat" && issuedAt) {
        return {
          key: k,
          value: val,
          description: desc,
          isDate: true,
          dateString: issuedAt.toUTCString(),
          relativeTime: getRelativeTime(issuedAt, now),
        };
      }
      if (k === "nbf" && notBefore) {
        return {
          key: k,
          value: val,
          description: desc,
          isDate: true,
          dateString: notBefore.toUTCString(),
          relativeTime: getRelativeTime(notBefore, now),
        };
      }

      return {
        key: k,
        value: val,
        description: desc,
      };
    });

    return {
      raw: cleaned,
      rawHeader: parts[0],
      rawPayload: parts[1],
      rawSignature: parts[2],
      header,
      payload,
      headerJson: JSON.stringify(header, null, 2),
      payloadJson: JSON.stringify(payload, null, 2),
      algorithm: String(header.alg || "Unknown"),
      tokenType: String(header.typ || "JWT"),
      isExpired,
      isNotYetValid,
      expiresAt,
      issuedAt,
      notBefore,
      expiresFormatted: expiresAt?.toUTCString(),
      expiresRelative: expiresAt ? getRelativeTime(expiresAt, now) : undefined,
      issuedFormatted: issuedAt?.toUTCString(),
      notBeforeFormatted: notBefore?.toUTCString(),
      claims,
      isValidFormat: true,
    };
  } catch (err) {
    return {
      raw: cleaned,
      rawHeader: parts[0],
      rawPayload: parts[1],
      rawSignature: parts[2],
      header: {},
      payload: {},
      headerJson: "",
      payloadJson: "",
      algorithm: "",
      tokenType: "",
      isExpired: false,
      isNotYetValid: false,
      claims: [],
      isValidFormat: false,
      error: `Could not decode token parts: ${err instanceof Error ? err.message : "Malformed JSON or Base64Url encoding"}.`,
    };
  }
}

/**
 * Sample JWT tokens for quick exploration.
 */
export const sampleTokens = {
  valid:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZG8gTWFyY2VsaW5vIiwiZW1haWwiOiJhbGRvQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5ODcyMzkwMjJ9.4zC4m_k4uQ0xP1E7N3bH0bL1nK8vC3tF6sE9wA2zL5Y",
  expired:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzk5OSIsIm5hbWUiOiJKb2huIERvZSIsImVtYWlsIjoiam9obkBkb2UubG9jYWwiLCJyb2xlIjoidXNlciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAzNjAwfQ.dbP61kOaZf-uO0j7N2yqE4mP8sT0wB5cK1rL4vF7xH8",
  custom:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImF1dGgwLWtleS0wMSJ9.eyJpc3MiOiJodHRwczovL2F1dGguYWwxZGV2LnRvby8iLCJzdWIiOiJhdXRoMHw2NWQ4OTc1Zjk5ODcwMSIsImF1ZCI6WyJodHRwczovL2FwaS5hbDFkZXYudG9vLyIsImh0dHBzOi8vYWwxZGV2LnRvby91c2VyaW5mbyJdLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMCwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCByZWFkOm1lc3NhZ2VzIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
};

/** Static assets need no inline scripts; HTML receives a fresh nonce in proxy.ts. */
export function contentSecurityPolicy(nonce?: string, development = false): string {
  if (nonce && !/^[A-Za-z0-9+/=_-]+$/.test(nonce)) {
    throw new Error("Invalid CSP nonce.");
  }
  return [
    "default-src 'self'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ""}${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // Interactive controls use React style attributes (sliders, tooltips, previews).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    `connect-src 'self' blob:${development ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

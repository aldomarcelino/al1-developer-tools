import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "./lib/security/csp";

export function proxy(request: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  // Always replace client-supplied values before they reach the renderer.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  // HTML and its nonce must never be shared between requests by a CDN.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|brand/|previews/|audio/|social-preview).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Proxy (formerly "middleware") runs at the edge, ahead of
 * routing — good for response headers, bad as a security boundary.
 * CVE-2025-29927 showed that a crafted `x-middleware-subrequest`
 * header could skip Proxy entirely in vulnerable versions; the fix
 * is to pin a patched Next.js release (see package.json / README),
 * and to make sure nothing that actually matters for security — this
 * app has no auth, but a future version with accounts must take
 * note — depends solely on Proxy running. This file only ever sets
 * headers.
 */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  // 'unsafe-inline' on script/style is a known trade-off: Next.js
  // injects inline bootstrap scripts and styled-jsx output that a
  // strict CSP would block. A nonce-based CSP (generated per-request
  // in this same Proxy and threaded through next/script) removes
  // this, and is the natural next hardening step — noted here rather
  // than silently shipped as if it were already strict.
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  return response;
}

export const config = {
  matcher: [
    // Apply to everything except static assets and Next's internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

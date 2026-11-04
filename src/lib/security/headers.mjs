// Plain ESM so next.config.mjs can import it; typed with JSDoc and unit tested.

/**
 * Security headers sent on every response.
 * The CSP only sets `frame-ancestors` for now; a full script/style policy needs nonces and is
 * tracked as a follow-up.
 * @type {ReadonlyArray<{ key: string; value: string }>}
 */
export const SECURITY_HEADERS = Object.freeze([
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]);

/** Next.js `headers()` config: apply the security headers to every route. */
export async function securityHeaderRoutes() {
  return [{ source: "/:path*", headers: SECURITY_HEADERS }];
}

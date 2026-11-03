import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, the service worker and PWA files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|swe-worker|manifest.webmanifest).*)",
  ],
};

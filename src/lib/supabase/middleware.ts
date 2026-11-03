import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiredRoleFor } from "@/lib/auth/roles";
import { parsePublicEnv } from "@/lib/env";

/**
 * Refreshes the auth session cookie on every request and keeps signed-out users away from
 * protected pages. Role checks happen on the server in each page (requireRole).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = parsePublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (requiredRoleFor(request.nextUrl.pathname) === null) return response;

  if (!user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = "";
    return NextResponse.redirect(signIn);
  }

  // Protected pages hold personal data: never let the browser reuse them after sign-out (AC-1.4).
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

import { SAMPLE_PERSONAS } from "@/lib/sample-data/site";
import { HOME_PATH, isUserRole, type UserRole } from "./roles";

/** The two steps of passwordless sign-in, behind an interface so the flow can be tested. */
export interface DemoAuthGateway {
  /** Issues a one-time sign-in token for the email (server-side, privileged). */
  issueSignInToken(email: string): Promise<string>;
  /** Exchanges the token for a session stored in the request's cookies. */
  redeemSignInToken(tokenHash: string): Promise<void>;
}

export type DemoSignInResult = { ok: true; redirectTo: string } | { ok: false; message: string };

const UNAVAILABLE = "Sign-in is unavailable right now. Please try again.";

/** Signs in as the SAMPLE persona for a role. Only the demo personas can be used. */
export async function signInAsDemoPersona(
  role: unknown,
  gateway: DemoAuthGateway,
): Promise<DemoSignInResult> {
  if (!isUserRole(role)) {
    return { ok: false, message: "Choose a demo persona." };
  }
  const persona = SAMPLE_PERSONAS.find((candidate) => candidate.role === role);
  if (!persona) {
    return { ok: false, message: UNAVAILABLE };
  }
  try {
    const token = await gateway.issueSignInToken(persona.email);
    await gateway.redeemSignInToken(token);
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
  return { ok: true, redirectTo: HOME_PATH[role as UserRole] };
}

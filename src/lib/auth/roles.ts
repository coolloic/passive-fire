export type UserRole = "team_leader" | "project_manager";

export const HOME_PATH: Record<UserRole, string> = {
  team_leader: "/planned-work",
  project_manager: "/inbox",
};

/** Paths that need a signed-in user, and the role allowed to see each. */
const PROTECTED_PREFIXES: { prefix: string; role: UserRole }[] = [
  { prefix: "/planned-work", role: "team_leader" },
  { prefix: "/escalations", role: "team_leader" },
  { prefix: "/inbox", role: "project_manager" },
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The role a path requires, or null when the path is public. */
export function requiredRoleFor(pathname: string): UserRole | null {
  return PROTECTED_PREFIXES.find(({ prefix }) => matches(pathname, prefix))?.role ?? null;
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "team_leader" || value === "project_manager";
}

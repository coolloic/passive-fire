import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

/** Sends signed-in users to their home and everyone else to sign-in. */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? HOME_PATH[user.role] : "/sign-in");
}

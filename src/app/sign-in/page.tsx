import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoSignIn } from "@/components/organisms/DemoSignIn";
import { HOME_PATH } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { signInAsDemo } from "./actions";

export const metadata: Metadata = { title: "Sign in — QAntum Team Leader" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_PATH[user.role]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold md:text-3xl">QAntum Team Leader</h1>
        <p className="text-base">
          Check that the products for your planned passive fire work are in stock before going on
          site, and escalate shortages.
        </p>
      </div>
      <section aria-labelledby="demo-heading" className="flex flex-col gap-3">
        <h2 id="demo-heading" className="text-lg font-medium">
          Try the demo
        </h2>
        <p className="text-base text-neutral-600 dark:text-neutral-400">
          All data is SAMPLE data. Choose a persona to continue; no password is needed.
        </p>
        <DemoSignIn action={signInAsDemo} />
      </section>
    </main>
  );
}

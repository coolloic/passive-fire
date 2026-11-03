import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  userName: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Signed-in page layout: header with the page title, the user and actions, then content. */
export function AppShell({ title, userName, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-neutral-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8 dark:border-neutral-800">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">QAntum Team Leader</p>
            <p className="text-base">
              Signed in as <span className="font-medium">{userName}</span>
            </p>
          </div>
          {actions}
        </div>
      </header>
      <main className="flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="mb-4 text-2xl font-semibold md:text-3xl">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — QAntum Team Leader" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="text-base">
        This page is not available offline yet. Reconnect to the internet and try again.
      </p>
    </main>
  );
}

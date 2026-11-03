import { TextLink } from "@/components/atoms/TextLink";

/** Shown for planned work that does not exist, belongs to another team leader or is in the past. */
export default function PlannedWorkNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Planned work not found</h1>
      <p className="text-base">
        This planned work isn&apos;t available. It may have passed, or it may not be yours.
      </p>
      <TextLink href="/planned-work">Back to planned work</TextLink>
    </main>
  );
}

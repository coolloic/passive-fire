import { TextLink } from "@/components/atoms/TextLink";

export default function EscalationNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Escalation not found</h1>
      <p className="text-base">This escalation isn&apos;t available.</p>
      <TextLink href="/escalations">Back to my escalations</TextLink>
    </main>
  );
}

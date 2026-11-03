interface EscalationLineListProps {
  lines: readonly string[];
}

/** What an escalation is about, as plain-language lines. */
export function EscalationLineList({ lines }: EscalationLineListProps) {
  if (lines.length === 0) {
    return <p className="text-base">Nothing is short for this planned work right now.</p>;
  }
  return (
    <ul className="list-disc pl-5 text-base">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

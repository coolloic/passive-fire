import type { EscalationNoteRecord } from "@/lib/data/escalation-repository";

interface NoteListProps {
  notes: readonly EscalationNoteRecord[];
  formatTime: (iso: string) => string;
}

/** Notes on an escalation, oldest first. Authors the reader cannot see are shown generically. */
export function NoteList({ notes, formatTime }: NoteListProps) {
  if (notes.length === 0) return <p className="text-base">No notes yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        >
          <p className="whitespace-pre-wrap text-base">{note.body}</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {note.authorName ?? "Project manager"} · {formatTime(note.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

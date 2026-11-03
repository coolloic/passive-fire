import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoteList } from "./NoteList";

describe("NoteList", () => {
  it("shows each note as text with its author and time", () => {
    render(
      <NoteList
        formatTime={(iso) => `at ${iso}`}
        notes={[
          { id: "1", body: "<b>Need</b> by Friday", createdAt: "t1", authorName: "Sam" },
          { id: "2", body: "Chasing", createdAt: "t2", authorName: null },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("<b>Need</b> by Friday");
    expect(items[0]).toHaveTextContent("Sam · at t1");
    expect(items[1]).toHaveTextContent("Project manager · at t2");
  });

  it("says when there are no notes", () => {
    render(<NoteList notes={[]} formatTime={String} />);
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });
});

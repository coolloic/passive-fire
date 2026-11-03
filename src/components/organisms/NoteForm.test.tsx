import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoteForm, type AddNoteOutcome } from "./NoteForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function setup(outcome: AddNoteOutcome | Error) {
  const action = vi.fn(async () => {
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  render(<NoteForm escalationId="e1" maxLength={1000} action={action} />);
  return {
    action,
    field: screen.getByLabelText("Add a note"),
    add: screen.getByRole("button", { name: "Add note" }),
  };
}

describe("NoteForm", () => {
  it("adds the note, clears the field and refreshes", async () => {
    const { action, field, add } = setup({ kind: "added" });
    await userEvent.type(field, "Any update?");
    await userEvent.click(add);
    expect(action).toHaveBeenCalledWith({ escalationId: "e1", body: "Any update?" });
    expect(field).toHaveValue("");
    expect(refresh).toHaveBeenCalled();
  });

  it.each<[AddNoteOutcome | Error, string]>([
    [
      { kind: "invalid", message: "Write a note before adding it." },
      "Write a note before adding it.",
    ],
    [{ kind: "not_found" }, "This escalation is no longer available."],
    [{ kind: "error" }, "We couldn't add the note. Try again."],
    [new Error("network"), "We couldn't add the note. Try again."],
  ])("shows an error and keeps the text (%#)", async (outcome, message) => {
    const { field, add } = setup(outcome);
    await userEvent.type(field, "Keep");
    await userEvent.click(add);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(field).toHaveValue("Keep");
  });

  it("limits the length of the note", () => {
    const { field } = setup({ kind: "added" });
    expect(field).toHaveAttribute("maxLength", "1000");
  });
});

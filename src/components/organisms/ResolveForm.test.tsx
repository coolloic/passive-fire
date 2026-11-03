import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResolveForm, type ResolveOutcome } from "./ResolveForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const options = [
  { value: "stock_arriving" as const, label: "Stock arriving" },
  { value: "planned_work_rescheduled" as const, label: "Planned work rescheduled" },
];

function setup(outcome: ResolveOutcome | Error) {
  const action = vi.fn(async () => {
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  render(
    <ResolveForm escalationId="e1" options={options} maxCommentLength={1000} action={action} />,
  );
  return { action, submit: screen.getByRole("button", { name: "Resolve escalation" }) };
}

describe("ResolveForm", () => {
  beforeEach(() => refresh.mockClear());

  it("offers each resolution as a labelled radio button", () => {
    setup({ kind: "resolved" });
    expect(screen.getByRole("group", { name: "Resolution" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("resolves with the chosen reason and comment, then refreshes", async () => {
    const { action, submit } = setup({ kind: "resolved" });
    await userEvent.click(screen.getByRole("radio", { name: "Stock arriving" }));
    await userEvent.type(
      screen.getByLabelText("Comment for the team leader (optional)"),
      "Due Tuesday",
    );
    await userEvent.click(submit);
    expect(action).toHaveBeenCalledWith({
      escalationId: "e1",
      resolution: "stock_arriving",
      comment: "Due Tuesday",
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refreshes and explains when someone else resolved it first", async () => {
    const { submit } = setup({ kind: "not_open" });
    await userEvent.click(screen.getByRole("radio", { name: "Stock arriving" }));
    await userEvent.click(submit);
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Someone else already resolved this escalation.",
    );
  });

  it.each<[ResolveOutcome | Error, string]>([
    [
      { kind: "invalid", message: "Choose how the shortage was resolved." },
      "Choose how the shortage was resolved.",
    ],
    [{ kind: "not_found" }, "This escalation is no longer available."],
    [{ kind: "error" }, "We couldn't resolve the escalation. Try again."],
    [new Error("network"), "We couldn't resolve the escalation. Try again."],
  ])("shows an error (%#)", async (outcome, message) => {
    const { submit } = setup(outcome);
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(submit).toBeEnabled();
  });
});

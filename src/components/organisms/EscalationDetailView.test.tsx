import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EscalationRecord } from "@/lib/data/escalation-repository";
import { EscalationDetailView } from "./EscalationDetailView";

const escalation: EscalationRecord = {
  id: "e1",
  plannedWorkId: "pw",
  workDate: "2026-11-06",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  state: "open",
  raisedAt: "2026-11-03T10:00:00Z",
  resolution: null,
  shortageClearedAtSync: false,
  raisedByName: "Sam",
  resolutionComment: null,
  resolvedAt: null,
  lines: [{ productName: "Collar", unit: "each", quantityShort: 10, reason: "shortage" }],
  notes: [
    { id: "n1", body: "Need by Friday", createdAt: "2026-11-03T10:00:00Z", authorName: "Sam" },
  ],
};

describe("EscalationDetailView", () => {
  it("shows the summary, raiser, lines, notes and slots", () => {
    render(
      <EscalationDetailView
        escalation={escalation}
        plannedWorkHref="/planned-work/pw"
        actions={<p>Resolve here</p>}
        noteForm={<p>Add a note here</p>}
      />,
    );
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(summary).toHaveTextContent("Fri 6 Nov · Crew Alpha");
    expect(summary).toHaveTextContent("Harbour View · raised 3 Nov, 10:00 by Sam");
    expect(summary).toHaveTextContent("Open");
    expect(screen.getByRole("link", { name: "View the planned work" })).toHaveAttribute(
      "href",
      "/planned-work/pw",
    );
    expect(screen.getByRole("region", { name: "What was escalated" })).toHaveTextContent(
      "Short by 10 × Collar",
    );
    expect(screen.getByRole("region", { name: "Notes" })).toHaveTextContent("Need by Friday");
    expect(screen.getByText("Resolve here")).toBeInTheDocument();
    expect(screen.getByText("Add a note here")).toBeInTheDocument();
  });

  it("places actions after what was escalated and before the notes", () => {
    const { container } = render(
      <EscalationDetailView escalation={escalation} actions={<p>Resolve here</p>} />,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("What was escalated")).toBeLessThan(text.indexOf("Resolve here"));
    expect(text.indexOf("Resolve here")).toBeLessThan(text.indexOf("Notes"));
  });

  it("shows the resolution with its comment, and the cleared-at-sync note", () => {
    render(
      <EscalationDetailView
        escalation={{
          ...escalation,
          state: "resolved",
          resolution: "stock_arriving",
          resolutionComment: "Due Tuesday",
          shortageClearedAtSync: true,
          raisedByName: null,
        }}
      />,
    );
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(summary).toHaveTextContent("Resolution: Stock arriving — Due Tuesday");
    expect(summary).toHaveTextContent("The shortage was no longer present");
    expect(summary).not.toHaveTextContent(" by ");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a resolution without a comment", () => {
    render(
      <EscalationDetailView
        escalation={{ ...escalation, state: "resolved", resolution: "planned_work_rescheduled" }}
      />,
    );
    expect(screen.getByRole("region", { name: "Summary" })).toHaveTextContent(
      "Resolution: Planned work rescheduled",
    );
  });
});

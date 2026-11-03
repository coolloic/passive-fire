import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EscalationSummary } from "@/lib/data/escalation-repository";
import { EscalationList } from "./EscalationList";

const base: EscalationSummary = {
  id: "e1",
  plannedWorkId: "pw",
  workDate: "2026-11-06",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  state: "open",
  raisedAt: "2026-11-03T10:00:00Z",
  resolution: null,
  shortageClearedAtSync: false,
  raisedByName: null,
};

describe("EscalationList", () => {
  it("links to each escalation with its state and planned work", () => {
    render(
      <EscalationList
        escalations={[base]}
        hrefFor={(id) => `/escalations/${id}`}
        emptyMessage="None"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/escalations/e1");
    expect(link).toHaveTextContent("Fri 6 Nov · Crew Alpha");
    expect(link).toHaveTextContent("Open");
    expect(link).toHaveTextContent("Harbour View · raised 3 Nov, 10:00");
    expect(link).not.toHaveTextContent("Resolution");
  });

  it("shows the resolution and the cleared-at-sync note", () => {
    render(
      <EscalationList
        escalations={[
          { ...base, state: "resolved", resolution: "stock_arriving", shortageClearedAtSync: true },
        ]}
        hrefFor={(id) => id}
        emptyMessage="None"
      />,
    );
    expect(screen.getByRole("link")).toHaveTextContent("Resolution: Stock arriving");
    expect(screen.getByText("Shortage no longer present at sync")).toBeInTheDocument();
  });

  it("names who raised it when known", () => {
    render(
      <EscalationList
        escalations={[{ ...base, raisedByName: "Sam" }]}
        hrefFor={(id) => id}
        emptyMessage="None"
      />,
    );
    expect(screen.getByRole("link")).toHaveTextContent("raised 3 Nov, 10:00 by Sam");
  });

  it("shows the empty message", () => {
    render(
      <EscalationList
        escalations={[]}
        hrefFor={(id) => id}
        emptyMessage="You haven't raised any escalations."
      />,
    );
    expect(screen.getByText("You haven't raised any escalations.")).toBeInTheDocument();
  });
});

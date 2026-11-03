import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlannedWorkSummary } from "@/lib/services/planned-work-summaries";
import { PlannedWorkList } from "./PlannedWorkList";

const summary = (
  id: string,
  workDate: string,
  state: PlannedWorkSummary["state"],
): PlannedWorkSummary => ({
  plannedWorkId: id,
  workDate,
  crewName: "Crew Alpha",
  siteName: `Site ${id}`,
  scenarioCount: 2,
  state,
  reliesOnDelivery: false,
});

describe("PlannedWorkList", () => {
  it("shows an empty state when nothing is scheduled", () => {
    render(<PlannedWorkList summaries={[]} today="2026-11-10" />);
    expect(
      screen.getByText("Nothing is scheduled for your crews in the next 14 days."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("groups planned work under date headings", () => {
    render(
      <PlannedWorkList
        today="2026-11-10"
        summaries={[
          summary("a", "2026-11-10", "ready"),
          summary("b", "2026-11-11", "short"),
          summary("c", "2026-11-11", "unknown"),
          summary("d", "2026-11-14", "ready"),
        ]}
      />,
    );
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["Today", "Tomorrow", "Sat 14 Nov"]);
    const tomorrow = screen.getByRole("region", { name: "Tomorrow" });
    expect(
      within(tomorrow)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/planned-work/b", "/planned-work/c"]);
  });
});

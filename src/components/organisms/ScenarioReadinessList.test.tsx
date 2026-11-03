import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScenarioReadinessList } from "./ScenarioReadinessList";

describe("ScenarioReadinessList", () => {
  it("shows each scenario with count, solution, state and reasons", () => {
    render(
      <ScenarioReadinessList
        scenarios={[
          {
            scenarioId: "s1",
            label: "Risers",
            penetrationCount: 8,
            solutionCode: "0798",
            state: "short",
            reasons: ["Short by 10 × Collar"],
          },
          {
            scenarioId: "s2",
            label: "Ceiling",
            penetrationCount: 1,
            solutionCode: null,
            state: "unknown",
            reasons: ["No solution nominated for this scenario"],
          },
          {
            scenarioId: "s3",
            label: "Conduit",
            penetrationCount: 4,
            solutionCode: "0733",
            state: "ready",
            reasons: [],
          },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem").filter((item) => item.querySelector("h3"));
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole("heading", { name: "Risers" })).toBeInTheDocument();
    expect(items[0]).toHaveTextContent("8 penetrations · Solution 0798");
    expect(items[0]).toHaveTextContent("Short by 10 × Collar");
    expect(items[1]).toHaveTextContent("1 penetration · No nominated solution");
    expect(items[1]).toHaveTextContent("Unknown");
    expect(within(items[2]!).queryByRole("list")).not.toBeInTheDocument();
  });

  it("explains when there are no scenarios", () => {
    render(<ScenarioReadinessList scenarios={[]} />);
    expect(screen.getByText("No scenarios are planned for this work.")).toBeInTheDocument();
  });
});

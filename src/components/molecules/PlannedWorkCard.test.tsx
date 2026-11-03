import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlannedWorkCard } from "./PlannedWorkCard";

const props = {
  href: "/planned-work/pw1",
  siteName: "Harbour View (SAMPLE)",
  crewName: "Crew Alpha (SAMPLE)",
  scenarioCount: 3,
  state: "short" as const,
  reliesOnDelivery: false,
};

describe("PlannedWorkCard", () => {
  it("links to the planned work with its site, crew, scenario count and state", () => {
    render(<PlannedWorkCard {...props} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/planned-work/pw1");
    expect(link).toHaveTextContent("Harbour View (SAMPLE)");
    expect(link).toHaveTextContent("Crew Alpha (SAMPLE) · 3 scenarios");
    expect(link).toHaveTextContent("Short");
    expect(screen.queryByText("Relies on delivery")).not.toBeInTheDocument();
  });

  it("uses the singular for one scenario and shows the delivery flag", () => {
    render(<PlannedWorkCard {...props} scenarioCount={1} reliesOnDelivery />);
    expect(screen.getByRole("link")).toHaveTextContent("1 scenario");
    expect(screen.getByText("Relies on delivery")).toBeInTheDocument();
  });
});

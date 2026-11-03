import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EscalationLineList } from "./EscalationLineList";

describe("EscalationLineList", () => {
  it("lists each line", () => {
    render(
      <EscalationLineList
        lines={["Short by 10 × Collar", "A scenario has no nominated solution"]}
      />,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Short by 10 × Collar",
      "A scenario has no nominated solution",
    ]);
  });

  it("says when nothing is short", () => {
    render(<EscalationLineList lines={[]} />);
    expect(
      screen.getByText("Nothing is short for this planned work right now."),
    ).toBeInTheDocument();
  });
});

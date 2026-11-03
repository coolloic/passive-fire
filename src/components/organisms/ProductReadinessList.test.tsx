import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductReadinessList } from "./ProductReadinessList";

describe("ProductReadinessList", () => {
  it("shows needed, allocated and short for each product, with notes", () => {
    render(
      <ProductReadinessList
        products={[
          {
            productId: "collar",
            name: "Collar 50",
            unit: "each",
            needed: 16,
            allocated: 6,
            short: 10,
            state: "short",
            notes: ["14 already allocated to earlier planned work"],
          },
          {
            productId: "wrap",
            name: "Pipe wrap",
            unit: "metre",
            needed: 2,
            allocated: 2,
            short: 0,
            state: "ready",
            notes: [],
          },
        ]}
      />,
    );
    const collar = screen.getByRole("heading", { name: "Collar 50" }).closest("li")!;
    const values = within(collar)
      .getAllByRole("definition")
      .map((cell) => cell.textContent);
    expect(values).toEqual(["16", "6", "10"]);
    expect(collar).toHaveTextContent("14 already allocated to earlier planned work");
    const wrap = screen.getByRole("heading", { name: "Pipe wrap" }).closest("li")!;
    expect(
      within(wrap)
        .getAllByRole("definition")
        .map((cell) => cell.textContent),
    ).toEqual(["2 m", "2 m", "0 m"]);
    expect(within(wrap).queryByRole("list")).not.toBeInTheDocument();
  });

  it("explains when no product quantities are known", () => {
    render(<ProductReadinessList products={[]} />);
    expect(screen.getByText("No product quantities are known for this work.")).toBeInTheDocument();
  });
});

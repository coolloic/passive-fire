import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonLink } from "./ButtonLink";

describe("ButtonLink", () => {
  it("renders a link with button styling", () => {
    render(<ButtonLink href="/planned-work/1/escalate">Escalate</ButtonLink>);
    const link = screen.getByRole("link", { name: "Escalate" });
    expect(link).toHaveAttribute("href", "/planned-work/1/escalate");
    expect(link.className).toContain("min-h-11");
  });

  it("supports the secondary variant, full width and extra classes", () => {
    render(
      <ButtonLink href="/x" variant="secondary" fullWidth className="mt-4">
        View
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "View" });
    expect(link.className).toContain("border");
    expect(link.className).toContain("w-full");
    expect(link.className).toContain("mt-4");
  });
});

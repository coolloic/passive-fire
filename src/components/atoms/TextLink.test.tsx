import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextLink } from "./TextLink";

describe("TextLink", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a block link with a touch target, hover and focus styles", () => {
    render(
      <TextLink href="/planned-work" className="mb-4">
        Back
      </TextLink>,
    );
    const link = screen.getByRole("link", { name: "Back" });
    expect(link).toHaveAttribute("href", "/planned-work");
    expect(link).toHaveClass(
      "min-h-11",
      "hover:text-red-800",
      "hover:decoration-2",
      "focus-visible:outline",
      "mb-4",
    );
  });

  it("renders an inline link without the block layout", () => {
    render(
      <TextLink href="/x" variant="inline">
        View
      </TextLink>,
    );
    const link = screen.getByRole("link", { name: "View" });
    expect(link).not.toHaveClass("min-h-11");
    expect(link).toHaveClass("hover:text-red-800");
  });
});

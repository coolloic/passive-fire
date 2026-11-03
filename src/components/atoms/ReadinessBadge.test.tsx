import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadinessBadge } from "./ReadinessBadge";

describe("ReadinessBadge", () => {
  it.each([
    ["ready", "Ready"],
    ["short", "Short"],
    ["unknown", "Unknown"],
  ] as const)("shows %s as the text %s with a decorative icon", (state, label) => {
    const { container } = render(<ReadinessBadge state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

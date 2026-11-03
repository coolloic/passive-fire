import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EscalationStateBadge } from "./EscalationStateBadge";

describe("EscalationStateBadge", () => {
  it.each([
    ["open", "Open", "lucide-circle-dot"],
    ["resolved", "Resolved", "lucide-circle-check"],
  ] as const)("shows %s as %s with a decorative icon", (state, label, iconClass) => {
    const { container } = render(<EscalationStateBadge state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toHaveClass(iconClass);
  });
});

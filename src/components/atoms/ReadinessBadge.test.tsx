import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadinessBadge } from "./ReadinessBadge";

describe("ReadinessBadge", () => {
  it.each([
    ["ready", "Ready", "lucide-check"],
    ["short", "Short", "lucide-x"],
    ["unknown", "Unknown", "lucide-circle-question-mark"],
  ] as const)("shows %s as the text %s with a decorative %s icon", (state, label, iconClass) => {
    const { container } = render(<ReadinessBadge state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass(iconClass);
  });
});

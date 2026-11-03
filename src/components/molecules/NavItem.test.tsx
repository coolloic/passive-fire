import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Flag } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { NavButton, NavLink, NavUnavailable } from "./NavItem";

describe("NavItem", () => {
  it("links to a section and marks the current one", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { rerender } = render(<NavLink href="/escalations" icon={Flag} label="My escalations" />);
    const link = screen.getByRole("link", { name: "My escalations" });
    expect(link).toHaveAttribute("href", "/escalations");
    expect(link).not.toHaveAttribute("aria-current");
    expect(link).toHaveClass("min-h-14");

    rerender(<NavLink href="/escalations" icon={Flag} label="My escalations" current />);
    expect(screen.getByRole("link", { name: "My escalations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("acts as a button and forwards its props", async () => {
    const onClick = vi.fn();
    render(
      <NavButton
        icon={Flag}
        label="Assistant"
        onClick={onClick}
        aria-expanded={false}
        className="x"
      />,
    );
    const button = screen.getByRole("button", { name: "Assistant" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("x");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows a current button without extra classes", () => {
    render(<NavButton icon={Flag} label="Assistant" current />);
    expect(screen.getByRole("button", { name: "Assistant" }).className).not.toMatch(/\s$/);
  });

  it("explains a destination that cannot be reached", () => {
    render(<NavUnavailable icon={Flag} label="My escalations" reason="needs a connection" />);
    const item = screen.getByRole("link", { name: "My escalations , needs a connection" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).not.toHaveAttribute("href");
  });
});

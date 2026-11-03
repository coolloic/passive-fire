import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

describe("SignOutButton", () => {
  it("renders a submit button inside a form", () => {
    render(<SignOutButton action={vi.fn(async () => undefined)} />);
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
  });
});

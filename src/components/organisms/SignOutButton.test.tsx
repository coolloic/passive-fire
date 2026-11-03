import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

describe("SignOutButton", () => {
  it("clears saved pages before signing out", async () => {
    const calls: string[] = [];
    const clearCaches = vi.fn(async () => {
      calls.push("clear");
    });
    const action = vi.fn(async () => {
      calls.push("sign out");
    });
    render(<SignOutButton action={action} clearCaches={clearCaches} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(calls).toEqual(["clear", "sign out"]);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  });

  it("uses the real cache clearing by default", async () => {
    const action = vi.fn(async () => undefined);
    render(<SignOutButton action={action} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(action).toHaveBeenCalled();
  });
});

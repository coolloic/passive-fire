import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NeedsConnection } from "./NeedsConnection";

describe("NeedsConnection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the real control while online", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(
      <NeedsConnection label="Escalate" reason="Escalating needs a connection.">
        <a href="/escalate">Escalate</a>
      </NeedsConnection>,
    );
    expect(screen.getByRole("link", { name: "Escalate" })).toBeInTheDocument();
  });

  it("shows a disabled control with the reason while offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(
      <NeedsConnection label="Escalate" reason="Escalating needs a connection.">
        <a href="/escalate">Escalate</a>
      </NeedsConnection>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Escalate" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Escalating needs a connection.");
  });
});

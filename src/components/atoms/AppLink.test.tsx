import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLink } from "./AppLink";

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("AppLink", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a link with its attributes online", () => {
    setOnline(true);
    render(
      <AppLink href="/planned-work/1" className="card">
        Open
      </AppLink>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "/planned-work/1");
    expect(link).toHaveClass("card");
  });

  it("renders a plain anchor offline with the same href and attributes", () => {
    setOnline(false);
    render(
      <AppLink href="/planned-work/1" className="card" prefetch={false}>
        Open
      </AppLink>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "/planned-work/1");
    expect(link).toHaveClass("card");
    expect(link).not.toHaveAttribute("prefetch");
  });

  it("switches when connectivity changes", () => {
    setOnline(true);
    render(<AppLink href="/x">Go</AppLink>);
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/x");
  });
});

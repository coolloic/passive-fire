import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("shows the title, the signed-in user, actions and content", () => {
    render(
      <AppShell
        title="Planned work"
        userName="Sam Taylor (SAMPLE)"
        actions={<button type="button">Sign out</button>}
      >
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Planned work" })).toBeInTheDocument();
    expect(screen.getByText("Sam Taylor (SAMPLE)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Content");
  });

  it("renders without actions", () => {
    render(
      <AppShell title="Inbox" userName="Priya">
        <p>Empty</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Priya");
    expect(screen.getByRole("main").className).toContain("pb-[max(1.5rem");
  });

  it("shows navigation and leaves room for the phone bottom bar", () => {
    render(
      <AppShell title="Planned work" userName="Sam" nav={<nav aria-label="Main">Links</nav>}>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("main").className).toContain("pb-[calc(5rem");
  });
});

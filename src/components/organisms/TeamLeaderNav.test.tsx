import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAssistant } from "@/stores/assistant-store";
import { TeamLeaderNav } from "./TeamLeaderNav";

let pathname: string | null = "/planned-work";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("TeamLeaderNav", () => {
  afterEach(() => {
    resetAssistant();
    vi.restoreAllMocks();
    pathname = "/planned-work";
  });

  it("offers planned work, escalations and the assistant", () => {
    setOnline(true);
    render(<TeamLeaderNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Planned work" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "My escalations" })).toHaveAttribute(
      "href",
      "/escalations",
    );
    expect(within(nav).getByRole("button", { name: "Assistant" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it.each([
    ["/planned-work/abc/escalate", "Planned work"],
    ["/escalations/abc", "My escalations"],
  ])("marks the section of %s as current", (path, current) => {
    setOnline(true);
    pathname = path;
    render(<TeamLeaderNav />);
    expect(screen.getByRole("link", { current: "page" })).toHaveAccessibleName(current);
  });

  it("marks nothing current on other pages or without a path", () => {
    setOnline(true);
    pathname = null;
    render(<TeamLeaderNav />);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("opens and closes the assistant", async () => {
    setOnline(true);
    render(<TeamLeaderNav ask={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Assistant" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Assistant" })).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows escalations as needing a connection while offline", () => {
    setOnline(false);
    render(<TeamLeaderNav />);
    expect(
      screen.getByRole("link", { name: "My escalations , needs a connection" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Planned work stays available offline (ADR 0003).
    expect(screen.getByRole("link", { name: "Planned work" })).toHaveAttribute("href");
  });
});

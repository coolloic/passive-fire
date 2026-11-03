import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineIndicator } from "./OfflineIndicator";

function setNavigatorOnline(value: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("OfflineIndicator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing while online", () => {
    setNavigatorOnline(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the offline state", () => {
    setNavigatorOnline(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole("status")).toHaveTextContent(/you are offline/i);
  });

  it("hides once connectivity returns", () => {
    setNavigatorOnline(false);
    render(<OfflineIndicator />);

    act(() => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

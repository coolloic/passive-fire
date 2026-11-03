import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataFreshness, STALE_AFTER_MS } from "./DataFreshness";

const AS_OF = "2026-11-03T05:31:00Z";
const asOfMs = new Date(AS_OF).getTime();

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("DataFreshness", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows when the data was generated while online", () => {
    setOnline(true);
    render(<DataFreshness asOf={AS_OF} now={() => asOfMs + 1000} />);
    expect(screen.getByText("Data as of 3 Nov, 05:31")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains that saved data is shown while offline", () => {
    setOnline(false);
    render(<DataFreshness asOf={AS_OF} now={() => asOfMs} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're offline. Showing saved data from 3 Nov, 05:31.",
    );
  });

  it("switches to the offline notice when the connection drops", () => {
    setOnline(true);
    render(<DataFreshness asOf={AS_OF} now={() => asOfMs} />);
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("You're offline");
  });

  it("does not warn at exactly 24 hours", () => {
    setOnline(true);
    render(<DataFreshness asOf={AS_OF} now={() => asOfMs + STALE_AFTER_MS} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns once the data is more than 24 hours old", () => {
    setOnline(false);
    render(<DataFreshness asOf={AS_OF} now={() => asOfMs + STALE_AFTER_MS + 1} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Readiness may be out of date. Reconnect before relying on it.",
    );
  });

  it("uses the real clock by default", () => {
    setOnline(true);
    render(<DataFreshness asOf="2000-01-01T00:00:00Z" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

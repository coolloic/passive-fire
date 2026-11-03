import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaveForOffline } from "./SaveForOffline";

const ok = (status = 200) => new Response("", { status });

describe("SaveForOffline", () => {
  it("pre-loads each page through the service worker and reports how many were saved", async () => {
    const fetcher = vi.fn(async () => ok());
    render(
      <SaveForOffline
        hrefs={["/planned-work/a", "/planned-work/b"]}
        fetcher={fetcher}
        hasServiceWorker={() => true}
      />,
    );
    expect(await screen.findByText("Saved 2 planned works for offline use")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/planned-work/a", {
      credentials: "same-origin",
      headers: { "X-Offline-Prefetch": "1" },
    });
  });

  it("also saves extra pages without counting them", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => ok());
    render(
      <SaveForOffline
        hrefs={["/planned-work/a"]}
        alsoSave={["/planned-work"]}
        fetcher={fetcher}
        hasServiceWorker={() => true}
      />,
    );
    expect(await screen.findByText("Saved 1 planned work for offline use")).toBeInTheDocument();
    expect(fetcher.mock.calls.map(([href]) => href).sort()).toEqual([
      "/planned-work",
      "/planned-work/a",
    ]);
  });

  it("counts only pages that loaded", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok(500))
      .mockRejectedValueOnce(new Error("net"));
    render(
      <SaveForOffline hrefs={["/a", "/b", "/c"]} fetcher={fetcher} hasServiceWorker={() => true} />,
    );
    expect(await screen.findByText("Saved 1 planned work for offline use")).toBeInTheDocument();
  });

  it("does nothing without an active service worker or pages", async () => {
    const fetcher = vi.fn(async () => ok());
    const { rerender } = render(
      <SaveForOffline hrefs={["/a"]} fetcher={fetcher} hasServiceWorker={() => false} />,
    );
    rerender(<SaveForOffline hrefs={[]} fetcher={fetcher} hasServiceWorker={() => true} />);
    await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
    expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
  });

  it("ignores results that arrive after unmounting", async () => {
    let resolve: (value: Response) => void = () => {};
    const fetcher = vi.fn(() => new Promise<Response>((done) => (resolve = done)));
    const { unmount } = render(
      <SaveForOffline hrefs={["/a"]} fetcher={fetcher} hasServiceWorker={() => true} />,
    );
    unmount();
    resolve(ok());
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does nothing by default when no service worker controls the page", () => {
    render(<SaveForOffline hrefs={["/a"]} />);
    expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
  });

  it("uses the browser's fetch when a service worker controls the page", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { controller: {} },
      configurable: true,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok());
    render(<SaveForOffline hrefs={["/a"]} />);
    expect(await screen.findByText("Saved 1 planned work for offline use")).toBeInTheDocument();
    fetchSpy.mockRestore();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineEscalate } from "./OfflineEscalate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function setup(online: boolean, add = vi.fn(async () => undefined)) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  render(
    <OfflineEscalate
      plannedWorkId="pw"
      label="Fri 6 Nov · Crew Alpha"
      lines={["Short by 10 × Collar"]}
      userId="u1"
      maxNoteLength={1000}
      store={{ add }}
    >
      <a href="/planned-work/pw/escalate">Escalate</a>
    </OfflineEscalate>,
  );
  return { add };
}

describe("OfflineEscalate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the normal escalate link online", () => {
    setup(true);
    expect(screen.getByRole("link", { name: "Escalate" })).toBeInTheDocument();
  });

  it("saves an escalation on the device while offline", async () => {
    const { add } = setup(false);
    await userEvent.click(screen.getByRole("button", { name: "Escalate offline" }));
    expect(screen.getByRole("region", { name: "What will be escalated" })).toHaveTextContent(
      "Short by 10 × Collar",
    );
    await userEvent.type(
      screen.getByLabelText("Note for the project manager (optional)"),
      "Need by Friday",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send escalation" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved on this device");
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        plannedWorkId: "pw",
        label: "Fri 6 Nov · Crew Alpha",
        note: "Need by Friday",
        status: "waiting",
      }),
    );
    const [saved] = add.mock.calls[0] as unknown as [{ id: string; createdAt: string }];
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(saved.createdAt))).toBe(false);
  });

  it("reports when the device cannot save it", async () => {
    setup(
      false,
      vi.fn(async () => Promise.reject(new Error("quota"))),
    );
    await userEvent.click(screen.getByRole("button", { name: "Escalate offline" }));
    await userEvent.click(screen.getByRole("button", { name: "Send escalation" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("uses the device outbox by default", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(
      <OfflineEscalate plannedWorkId="pw" label="l" lines={[]} userId="u1" maxNoteLength={1000}>
        <a href="/x">Escalate</a>
      </OfflineEscalate>,
    );
    expect(screen.getByRole("button", { name: "Escalate offline" })).toBeInTheDocument();
  });
});

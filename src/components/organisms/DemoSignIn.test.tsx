import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoSignIn, type DemoSignInState } from "./DemoSignIn";

const TEAM_LEADER = { name: "Continue as Team Leader (SAMPLE)" };
const PROJECT_MANAGER = { name: "Continue as Project Manager (SAMPLE)" };

describe("DemoSignIn", () => {
  it("offers both SAMPLE personas", () => {
    render(<DemoSignIn action={vi.fn()} />);
    expect(screen.getByRole("button", TEAM_LEADER)).toBeEnabled();
    expect(screen.getByRole("button", PROJECT_MANAGER)).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [TEAM_LEADER, "team_leader"],
    [PROJECT_MANAGER, "project_manager"],
  ])("signs in with the chosen role (%s)", async (button, role) => {
    const action = vi.fn(async () => ({ message: null }));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", button));
    expect(action).toHaveBeenCalledWith(role);
  });

  it("clears pages saved for a previous user before signing in", async () => {
    const calls: string[] = [];
    const clearDeviceData = vi.fn(async () => {
      calls.push("clear");
    });
    const action = vi.fn(async () => {
      calls.push("sign in");
      return { message: null };
    });
    render(<DemoSignIn action={action} clearDeviceData={clearDeviceData} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(calls).toEqual(["clear", "sign in"]);
  });

  it("shows the message the action returns", async () => {
    const action = vi.fn(async () => ({ message: "Choose a demo persona." }));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a demo persona.");
  });

  it("shows a friendly message when the action throws", async () => {
    const action = vi.fn(async () => Promise.reject(new Error("network")));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in is unavailable");
    expect(screen.getByRole("button", TEAM_LEADER)).toBeEnabled();
  });

  it("disables both buttons and announces progress while signing in", async () => {
    let finish: (state: DemoSignInState) => void = () => {};
    const action = vi.fn(() => new Promise<DemoSignInState>((resolve) => (finish = resolve)));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(screen.getByRole("button", TEAM_LEADER)).toBeDisabled();
    expect(screen.getByRole("button", PROJECT_MANAGER)).toBeDisabled();
    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    finish({ message: null });
    await waitFor(() => expect(screen.getByRole("button", TEAM_LEADER)).toBeEnabled());
  });
});

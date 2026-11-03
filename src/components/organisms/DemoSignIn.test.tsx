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

  it("disables both buttons and announces the chosen persona while signing in", async () => {
    const action = vi.fn(() => new Promise<DemoSignInState>(() => {}));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", PROJECT_MANAGER));
    expect(screen.getByRole("button", TEAM_LEADER)).toBeDisabled();
    expect(screen.getByRole("button", PROJECT_MANAGER)).toBeDisabled();
    expect(screen.getByRole("button", PROJECT_MANAGER)).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", TEAM_LEADER)).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("Signing in as Project Manager (SAMPLE)…")).toBeInTheDocument();
  });

  // Regression: a successful server action redirects and resolves with no state. That must not
  // be shown as a failure, and the buttons must stay in the signing-in state until navigation.
  it.each([
    ["no result (redirect)", undefined],
    ["a result without a message", { message: null }],
  ])("stays optimistic when the action resolves with %s", async (_label, result) => {
    const action = vi.fn(async () => result as unknown as DemoSignInState);
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", TEAM_LEADER)).toBeDisabled();
    expect(screen.getByText("Signing in as Team Leader (SAMPLE)…")).toBeInTheDocument();
  });

  it("rolls back the optimistic state when the action returns a message", async () => {
    const action = vi.fn(async () => ({ message: "Sign-in is unavailable right now." }));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in is unavailable");
    expect(screen.getByRole("button", TEAM_LEADER)).toBeEnabled();
    expect(screen.getByRole("button", TEAM_LEADER)).not.toHaveAttribute("aria-busy");
    expect(screen.queryByText(/Signing in as/)).not.toBeInTheDocument();
  });

  it("clears an earlier error as soon as the person tries again", async () => {
    const action = vi
      .fn<(role: string) => Promise<DemoSignInState>>()
      .mockResolvedValueOnce({ message: "Sign-in is unavailable right now." })
      .mockImplementationOnce(() => new Promise<DemoSignInState>(() => {}));
    render(<DemoSignIn action={action} />);
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", TEAM_LEADER));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Signing in as Team Leader (SAMPLE)…")).toBeInTheDocument();
  });
});

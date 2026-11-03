import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a button that defaults to type=button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("forwards native props, aria attributes and the ref", async () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        type="submit"
        aria-describedby="hint"
        name="role"
        value="team_leader"
        onClick={onClick}
      >
        Go
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-describedby", "hint");
    expect(button).toHaveAttribute("value", "team_leader");
    expect(ref.current).toBe(button);
  });

  it("does not fire clicks when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Wait
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Wait" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant, width and extra classes", () => {
    render(
      <Button variant="secondary" fullWidth className="mt-2">
        Other
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Other" });
    expect(button.className).toContain("border");
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("mt-2");
    expect(button.className).toContain("min-h-11");
  });
});

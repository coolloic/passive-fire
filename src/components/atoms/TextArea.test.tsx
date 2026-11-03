import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { TextArea } from "./TextArea";

describe("TextArea", () => {
  it("forwards native props and the ref, with hover and focus styles", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextArea ref={ref} aria-label="Note" rows={3} maxLength={10} className="w-full" />);
    const field = screen.getByRole("textbox", { name: "Note" });
    expect(ref.current).toBe(field);
    expect(field).toHaveAttribute("rows", "3");
    expect(field).toHaveAttribute("maxLength", "10");
    expect(field).toHaveClass("w-full");
  });

  it("uses a neutral focus ring and keeps red for invalid input", () => {
    render(<TextArea aria-label="Note" aria-invalid="true" />);
    const field = screen.getByRole("textbox", { name: "Note" });
    expect(field).toHaveClass(
      "focus-visible:ring-neutral-900",
      "focus-visible:outline-transparent",
      "aria-[invalid=true]:border-red-700",
      "aria-[invalid=true]:focus-visible:ring-red-700",
    );
    expect(field.className).not.toMatch(/(^| )focus-visible:(border|ring|outline)-red/);
  });

  it("looks unavailable when disabled", () => {
    render(<TextArea aria-label="Question" disabled />);
    const field = screen.getByRole("textbox", { name: "Question" });
    expect(field).toBeDisabled();
    expect(field).toHaveClass("disabled:cursor-not-allowed", "disabled:bg-neutral-100");
  });

  it("works without extra classes", () => {
    render(<TextArea aria-label="Comment" />);
    expect(screen.getByRole("textbox", { name: "Comment" }).className).not.toContain("undefined");
  });
});

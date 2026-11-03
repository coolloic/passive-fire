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
    expect(field).toHaveClass("hover:border-neutral-500", "focus-visible:outline", "w-full");
  });

  it("works without extra classes", () => {
    render(<TextArea aria-label="Comment" />);
    expect(screen.getByRole("textbox", { name: "Comment" }).className).not.toContain("undefined");
  });
});

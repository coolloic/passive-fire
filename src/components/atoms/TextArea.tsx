import { forwardRef, type TextareaHTMLAttributes } from "react";

// Red is reserved for errors and primary actions, so focus uses a neutral, high-contrast ring
// (≥ 3:1 against the page in both themes, WCAG 1.4.11). The transparent outline keeps a visible
// focus indicator in forced-colours mode, where box-shadow rings are removed.
const STYLES = [
  "rounded-md border border-neutral-500 bg-white p-3 text-base text-neutral-900 transition-colors",
  "dark:bg-neutral-900 dark:text-neutral-100",
  "hover:border-neutral-700 dark:hover:border-neutral-300",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-transparent",
  "focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900",
  "dark:focus-visible:border-neutral-100 dark:focus-visible:ring-neutral-100",
  // Invalid: red border; red ring when focused.
  "aria-[invalid=true]:border-red-700 aria-[invalid=true]:focus-visible:border-red-700 aria-[invalid=true]:focus-visible:ring-red-700",
  "dark:aria-[invalid=true]:border-red-400 dark:aria-[invalid=true]:focus-visible:border-red-400 dark:aria-[invalid=true]:focus-visible:ring-red-400",
  "disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-500",
  "dark:disabled:border-neutral-700 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-400",
].join(" ");

/** Multi-line input with consistent hover, focus, invalid and disabled styles. Forwards native props. */
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={[STYLES, className].filter(Boolean).join(" ")} {...props} />
  );
});

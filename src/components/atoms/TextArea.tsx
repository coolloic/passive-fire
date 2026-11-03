import { forwardRef, type TextareaHTMLAttributes } from "react";

/** Multi-line input with consistent hover, focus and invalid styles. Forwards native props. */
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={[
        "rounded-md border border-neutral-300 p-3 text-base transition-colors",
        "hover:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-neutral-400",
        "focus-visible:border-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-700",
        "aria-[invalid=true]:border-red-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

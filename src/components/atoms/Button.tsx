import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:outline-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100",
};

/** Accessible button with a 44 px minimum touch target. Forwards every native button prop. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = false, className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 py-2 text-base font-medium",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900 focus-visible:outline-red-700",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-neutral-700 dark:hover:bg-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100",
};

/** Shared classes so links that look like buttons stay consistent with Button. */
export function buttonClassName(
  variant: ButtonVariant = "primary",
  fullWidth = false,
  extra = "",
): string {
  return [
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 py-2 text-base font-medium",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASSES[variant],
    fullWidth ? "w-full" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Accessible button with a 44 px minimum touch target. Forwards every native button prop. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = false, className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName(variant, fullWidth, className)}
      {...props}
    />
  );
});

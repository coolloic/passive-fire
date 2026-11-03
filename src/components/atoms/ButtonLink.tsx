import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClassName, type ButtonVariant } from "./Button";

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

/** A navigation link styled as a button. Use Button for actions, ButtonLink for navigation. */
export function ButtonLink({
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, fullWidth, className)} {...props} />;
}

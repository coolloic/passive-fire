"use client";

import { AppLink, type AppLinkProps } from "./AppLink";

export interface TextLinkProps extends AppLinkProps {
  /** "block" gives a 44 px touch target; "inline" is for links inside a sentence. */
  variant?: "block" | "inline";
}

const BASE =
  "rounded-sm text-base underline decoration-1 underline-offset-4 transition-colors " +
  "hover:text-red-800 hover:decoration-2 dark:hover:text-red-300 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700";

/** A text link with consistent hover and keyboard focus styles. Works offline via AppLink. */
export function TextLink({ variant = "block", className = "", ...props }: TextLinkProps) {
  const layout = variant === "block" ? "inline-flex min-h-11 items-center" : "";
  return <AppLink className={[layout, BASE, className].filter(Boolean).join(" ")} {...props} />;
}

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { AppLink } from "@/components/atoms/AppLink";

interface NavItemBaseProps {
  icon: LucideIcon;
  label: string;
  /** The page (or panel) the user is on. */
  current?: boolean;
}

const BASE =
  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-base";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100";
const IDLE =
  "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white";
const CURRENT = "bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-white";

const classes = (current: boolean | undefined) => [BASE, FOCUS, current ? CURRENT : IDLE].join(" ");

function Content({ icon: Icon, label }: Pick<NavItemBaseProps, "icon" | "label">) {
  return (
    <>
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span>{label}</span>
    </>
  );
}

/** A navigation link; marks the current section with `aria-current`. */
export function NavLink({ href, icon, label, current }: NavItemBaseProps & { href: string }) {
  return (
    <AppLink href={href} aria-current={current ? "page" : undefined} className={classes(current)}>
      <Content icon={icon} label={label} />
    </AppLink>
  );
}

/** A navigation item that opens something on the page (e.g. a dialog). */
export function NavButton({
  icon,
  label,
  current,
  className = "",
  type = "button",
  ...props
}: NavItemBaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`${classes(current)} ${className}`.trim()} {...props}>
      <Content icon={icon} label={label} />
    </button>
  );
}

/** A destination that cannot be reached right now, with the reason for screen readers. */
export function NavUnavailable({
  icon,
  label,
  reason,
}: Omit<NavItemBaseProps, "current"> & { reason: string }) {
  return (
    <span
      role="link"
      aria-disabled="true"
      className={`${BASE} cursor-not-allowed text-neutral-400 dark:text-neutral-500`}
    >
      <Content icon={icon} label={label} />
      <span className="sr-only">, {reason}</span>
    </span>
  );
}

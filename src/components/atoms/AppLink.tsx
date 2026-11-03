"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Next.js Link online; a plain anchor offline, so the browser requests the page document and the
 * service worker can serve its saved copy (ADR 0003). Client-side transitions would need page data
 * that is deliberately never cached.
 */
export function AppLink({
  href,
  prefetch,
  replace,
  scroll,
  shallow,
  passHref,
  legacyBehavior,
  locale,
  ...props
}: AppLinkProps) {
  const online = useOnlineStatus();
  if (!online) return <a href={href} {...props} />;
  return (
    <Link
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      passHref={passHref}
      legacyBehavior={legacyBehavior}
      locale={locale}
      {...props}
    />
  );
}

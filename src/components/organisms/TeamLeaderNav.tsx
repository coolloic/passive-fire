"use client";

import { CalendarDays, CloudOff, Flag, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavButton, NavLink, NavUnavailable } from "@/components/molecules/NavItem";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { AssistantPanel, type AssistantPanelProps } from "./AssistantPanel";

interface TeamLeaderNavProps {
  /** Injected for tests. */
  ask?: AssistantPanelProps["ask"];
}

/**
 * The team leader's main navigation, always within reach: a bottom bar on phones and part of the
 * sticky header on larger screens. Also hosts the assistant dialog.
 */
export function TeamLeaderNav({ ask }: TeamLeaderNavProps) {
  const pathname = usePathname() ?? "";
  const online = useOnlineStatus();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const inSection = (base: string) => pathname === base || pathname.startsWith(`${base}/`);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-[var(--background)] px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 dark:border-neutral-800"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 md:flex md:max-w-none">
          <li>
            <NavLink
              href="/planned-work"
              icon={CalendarDays}
              label="Planned work"
              current={inSection("/planned-work")}
            />
          </li>
          <li>
            {online ? (
              <NavLink
                href="/escalations"
                icon={Flag}
                label="My escalations"
                current={inSection("/escalations")}
              />
            ) : (
              <NavUnavailable icon={CloudOff} label="My escalations" reason="needs a connection" />
            )}
          </li>
          <li>
            <NavButton
              icon={MessageCircle}
              label="Assistant"
              aria-haspopup="dialog"
              aria-expanded={assistantOpen}
              current={assistantOpen}
              onClick={() => setAssistantOpen(true)}
            />
          </li>
        </ul>
      </nav>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} ask={ask} />
    </>
  );
}

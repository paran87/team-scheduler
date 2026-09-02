import type { ReactNode } from "react";
import type { TabName } from "@/lib/types";

const ICONS: Record<TabName, ReactNode> = {
  calendar: (
      <>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
        <path d="M3 9.5h18" />
        <path d="M8 3v3.5" />
        <path d="M16 3v3.5" />
        <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
      </>
    ),
  activity: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3.5v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2" />
        <path d="M8.5 11h7M8.5 15h5" />
      </>
    ),
  assignment: (
      <>
        <circle cx="9" cy="8" r="2.4" />
        <circle cx="16" cy="9" r="2.1" />
        <path d="M4.5 18.5c.4-3 2.4-4.6 4.5-4.6s4.1 1.6 4.5 4.6" />
        <path d="M13.2 14.4c1.3-.6 2.8-.4 4 .7.8.8 1.3 1.9 1.5 3.4" />
      </>
    ),
  map: (
      <>
        <path d="M12 21s7-6.1 7-11.2A7 7 0 0 0 5 9.8C5 14.9 12 21 12 21z" />
        <circle cx="12" cy="9.6" r="2.2" />
      </>
    ),
};

export function TabIcon({ name }: { name: TabName }) {
  return (
    <span className="tab-icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </svg>
    </span>
  );
}

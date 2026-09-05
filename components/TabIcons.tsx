import type { ReactNode } from "react";
import type { TabName } from "@/lib/types";

const ICONS: Record<TabName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
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
  reports: (
    <>
      <path d="M4 19.5V6.5a2 2 0 0 1 2-2h8.5L20 9v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M14 4.5V9h4.5" />
      <path d="M8 13h8M8 16.5h5" />
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

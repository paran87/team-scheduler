"use client";

import Link from "next/link";
import type { TabName } from "@/lib/types";
import { OKB_PORTAL_URL } from "@/lib/brand";
import { BrandLogo } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";
import { CommandRibbon } from "./CommandRibbon";
import { OkbWebsiteButton } from "./OkbWebsiteButton";
import { TabIcon } from "./TabIcons";

const TABS: { id: TabName; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "calendar", label: "Calendar" },
  { id: "activity", label: "Activities" },
  { id: "reports", label: "Reports" },
];

type TopBarProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  onOpenToday?: () => void;
};

export function TopBar({ activeTab, onTabChange, onOpenToday }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <BrandWordmark />
        </div>
        <CommandRibbon onOpenToday={onOpenToday} />
        <div className="topbar-actions">
          <OkbWebsiteButton />
          <Link href="/backend" className="backend-nav-link">
            Admin
          </Link>
        </div>
      </div>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn tab-${tab.id}${activeTab === tab.id ? " active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <TabIcon name={tab.id} />
            {tab.label}
          </button>
        ))}
        <a
          href={OKB_PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="tab-btn tab-portal"
        >
          <span className="tab-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4h6v6" />
              <path d="M20 4l-9 9" />
              <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
            </svg>
          </span>
          OKB Portal
        </a>
      </nav>
    </header>
  );
}

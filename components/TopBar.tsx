"use client";

import Link from "next/link";
import type { TabName } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";
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
};

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <BrandWordmark />
        </div>
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
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { MONTH_NAMES } from "@/lib/schedule-data";
import type { TabName } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";
import { TabIcon } from "./TabIcons";

const TABS: { id: TabName; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "activity", label: "Activity" },
  { id: "assignment", label: "Team Assignment" },
  { id: "map", label: "Show Map" },
];

type TopBarProps = {
  viewYear: number;
  viewMonth: number;
  activeTab: TabName;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onTabChange: (tab: TabName) => void;
};

export function TopBar({
  viewYear,
  viewMonth,
  activeTab,
  onPrevMonth,
  onNextMonth,
  onToday,
  onTabChange,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <div>
            <p className="brand-title">Team Schedule Dashboard</p>
            <p className="brand-sub">Field Deployment Calendar</p>
          </div>
        </div>
        <div
          className="nav-controls"
          style={{ display: activeTab === "calendar" || activeTab === "map" ? "flex" : "none" }}
        >
          <button className="icon-btn" title="Previous month" onClick={onPrevMonth}>
            ←
          </button>
          <div className="month-label">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button className="icon-btn" title="Next month" onClick={onNextMonth}>
            →
          </button>
          <button className="today-btn" onClick={onToday}>
            Today
          </button>
        </div>
        <Link href="/backend" className="backend-nav-link">
          Admin
        </Link>
      </div>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
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

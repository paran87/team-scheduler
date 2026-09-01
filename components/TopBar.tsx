"use client";

import { MONTH_NAMES } from "@/lib/schedule-data";
import type { TabName } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";

const TABS: { id: TabName; icon: string; label: string }[] = [
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "activity", icon: "📋", label: "Activity" },
  { id: "assignment", icon: "🗺️", label: "Team Assignment" },
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
          style={{ display: activeTab === "calendar" ? "flex" : "none" }}
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
      </div>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

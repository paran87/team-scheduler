"use client";

import Link from "next/link";
import { MONTH_NAMES } from "@/lib/schedule-data";
import { BrandLogo } from "./BrandLogo";

type AdminTopBarProps = {
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

export function AdminTopBar({ viewYear, viewMonth, onPrevMonth, onNextMonth, onToday }: AdminTopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <div>
            <p className="brand-title">Team Schedule Dashboard</p>
            <p className="brand-sub">Admin · Edit schedule &amp; activities</p>
          </div>
        </div>
        <div className="nav-controls">
          <button className="icon-btn" title="Previous month" type="button" onClick={onPrevMonth}>
            ←
          </button>
          <div className="month-label">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button className="icon-btn" title="Next month" type="button" onClick={onNextMonth}>
            →
          </button>
          <button className="today-btn" type="button" onClick={onToday}>
            Today
          </button>
        </div>
        <Link href="/" className="backend-nav-link">
          View dashboard
        </Link>
      </div>
    </header>
  );
}

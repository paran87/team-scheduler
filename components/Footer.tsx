"use client";

import type { TabName, TeamKey } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";

type FooterProps = {
  onTabChange: (tab: TabName) => void;
  onTeamClick: (team: TeamKey) => void;
};

export function Footer({ onTabChange, onTeamClick }: FooterProps) {
  function goToTab(tab: TabName) {
    onTabChange(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandLogo />
          <div>
            <h4>Team Schedule Dashboard</h4>
            <p>Keeping every field team on track.</p>
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h5>Navigate</h5>
            <button className="footer-link" onClick={() => goToTab("calendar")}>
              Calendar
            </button>
            <button className="footer-link" onClick={() => goToTab("activity")}>
              Activity
            </button>
            <button className="footer-link" onClick={() => goToTab("assignment")}>
              Team Assignment
            </button>
          </div>
          <div className="footer-col">
            <h5>Teams</h5>
            <button className="footer-link" onClick={() => onTeamClick("usec")}>
              Team USEC
            </button>
            <button className="footer-link" onClick={() => onTeamClick("b")}>
              Team B
            </button>
            <button className="footer-link" onClick={() => onTeamClick("a")}>
              Team A
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Team Schedule Dashboard. All rights reserved.</span>
        <span>Built for field operations coordination.</span>
      </div>
    </footer>
  );
}

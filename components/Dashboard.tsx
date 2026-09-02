"use client";

import { useState } from "react";
import { shiftMonth } from "@/lib/calendar";
import type { TabName, TeamFilter } from "@/lib/types";
import { TopBar } from "./TopBar";
import { Legend } from "./Legend";
import { CalendarGrid } from "./CalendarGrid";
import { DetailPanel } from "./DetailPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { TeamAssignmentPanel } from "./TeamAssignmentPanel";
import { ShowMapPanel } from "./ShowMapPanel";
import { Footer } from "./Footer";
import { ActivityNotesProvider } from "./ActivityNotesProvider";

export function Dashboard() {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("calendar");
  const [assignmentFocus, setAssignmentFocus] = useState<TeamFilter>("all");

  function closePanel() {
    setPanelOpen(false);
    setSelectedDay(null);
  }

  function closePanelSilently() {
    setPanelOpen(false);
    setSelectedDay(null);
  }

  function selectDay(day: number) {
    setSelectedDay(day);
    setPanelOpen(true);
  }

  function goToMonth(offset: number) {
    const next = shiftMonth(viewYear, viewMonth, offset);
    setViewYear(next.year);
    setViewMonth(next.month);
    closePanelSilently();
  }

  function goToToday() {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    closePanelSilently();
  }

  function switchTab(tab: TabName) {
    setActiveTab(tab);
    if (tab !== "calendar") closePanelSilently();
    if (tab !== "assignment") setAssignmentFocus("all");
  }

  return (
    <ActivityNotesProvider>
      <TopBar
        viewYear={viewYear}
        viewMonth={viewMonth}
        activeTab={activeTab}
        onPrevMonth={() => goToMonth(-1)}
        onNextMonth={() => goToMonth(1)}
        onToday={goToToday}
        onTabChange={switchTab}
      />

      {activeTab === "calendar" ? <Legend /> : null}

      <main>
        <div className="page">
          <section className={`tab-panel${activeTab === "calendar" ? " active" : ""}`}>
            <div className="layout">
              <CalendarGrid
                viewYear={viewYear}
                viewMonth={viewMonth}
                selectedDay={selectedDay}
                onSelectDay={selectDay}
              />
              <DetailPanel
                viewYear={viewYear}
                viewMonth={viewMonth}
                selectedDay={selectedDay}
                open={panelOpen}
                onClose={closePanel}
              />
            </div>
          </section>

          <section className={`tab-panel${activeTab === "activity" ? " active" : ""}`}>
            <div className="section-heading">
              <h2>Team Activity Log</h2>
              <p>A chronological feed of every deployment logged this month.</p>
            </div>
            <ActivityTimeline viewYear={viewYear} viewMonth={viewMonth} />
          </section>

          <section className={`tab-panel${activeTab === "assignment" ? " active" : ""}`}>
            <TeamAssignmentPanel focusTeam={assignmentFocus} />
          </section>

          <section className={`tab-panel${activeTab === "map" ? " active" : ""}`}>
            {activeTab === "map" ? (
              <ShowMapPanel viewYear={viewYear} viewMonth={viewMonth} />
            ) : null}
          </section>
        </div>
      </main>

      <Footer onTabChange={switchTab} />

      <div
        className={`backdrop${panelOpen ? " show" : ""}`}
        onClick={closePanel}
        role="presentation"
      />
    </ActivityNotesProvider>
  );
}

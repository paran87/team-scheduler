"use client";

import { useState } from "react";
import { shiftMonth } from "@/lib/calendar";
import type { TabName } from "@/lib/types";
import { TopBar } from "./TopBar";
import { Legend } from "./Legend";
import { CalendarGrid } from "./CalendarGrid";
import { DetailPanel } from "./DetailPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { OverviewDashboard } from "./OverviewDashboard";
import { DayCompositionView } from "./DayCompositionView";
import { ReportsPanel } from "./ReportsPanel";
import { Footer } from "./Footer";
import { ActivityNotesProvider } from "./ActivityNotesProvider";

export function Dashboard() {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");
  const [dashboardView, setDashboardView] = useState<"overview" | "personnel">("overview");

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

  function switchTab(tab: TabName) {
    setActiveTab(tab);
    if (tab !== "calendar") closePanelSilently();
    if (tab !== "dashboard") setDashboardView("overview");
  }

  function openTodayActivities() {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
    setPanelOpen(true);
    setDashboardView("overview");
    setActiveTab("calendar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTodayPersonnel() {
    setDashboardView("personnel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const today = new Date();

  return (
    <ActivityNotesProvider>
      <TopBar activeTab={activeTab} onTabChange={switchTab} />

      {activeTab === "calendar" ? <Legend /> : null}

      <main>
        <div className="page">
          <section className={`tab-panel${activeTab === "dashboard" ? " active" : ""}`}>
            {activeTab === "dashboard" ? (
              dashboardView === "personnel" ? (
                <DayCompositionView
                  year={today.getFullYear()}
                  month={today.getMonth()}
                  day={today.getDate()}
                  onBack={() => setDashboardView("overview")}
                />
              ) : (
                <OverviewDashboard
                  onOpenTodayActivities={openTodayActivities}
                  onOpenTodayPersonnel={openTodayPersonnel}
                />
              )
            ) : null}
          </section>

          <section className={`tab-panel${activeTab === "calendar" ? " active" : ""}`}>
            <div className="layout">
              <CalendarGrid
                viewYear={viewYear}
                viewMonth={viewMonth}
                selectedDay={selectedDay}
                onSelectDay={selectDay}
                onPrevMonth={() => goToMonth(-1)}
                onNextMonth={() => goToMonth(1)}
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
              <h2>Team Activities Log</h2>
              <p>A chronological feed of every deployment logged this month.</p>
            </div>
            <ActivityTimeline viewYear={viewYear} viewMonth={viewMonth} />
          </section>

          <section className={`tab-panel${activeTab === "reports" ? " active" : ""}`}>
            <ReportsPanel
              viewYear={viewYear}
              viewMonth={viewMonth}
              onPrevMonth={() => goToMonth(-1)}
              onNextMonth={() => goToMonth(1)}
            />
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

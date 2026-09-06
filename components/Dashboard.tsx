"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shiftMonth } from "@/lib/calendar";
import { homeTabHref, TAB_STORAGE_KEY } from "@/lib/tabs";
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

export function Dashboard({ initialTab }: { initialTab: TabName }) {
  const router = useRouter();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [dashboardView, setDashboardView] = useState<"overview" | "personnel">("overview");

  useEffect(() => {
    setActiveTab(initialTab);
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, initialTab);
    } catch {
      /* sessionStorage unavailable */
    }
  }, [initialTab]);

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
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* sessionStorage unavailable */
    }
    const href = homeTabHref(tab);
    router.replace(href, { scroll: false });
  }

  function openDay(date: Date) {
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelectedDay(date.getDate());
    setPanelOpen(true);
    setDashboardView("overview");
    switchTab("calendar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTodayActivities() {
    openDay(new Date());
  }

  function openReports() {
    switchTab("reports");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTodayPersonnel() {
    setDashboardView("personnel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const today = new Date();

  return (
    <ActivityNotesProvider>
      <TopBar activeTab={activeTab} onTabChange={switchTab} onOpenToday={() => openDay(new Date())} />

      {activeTab === "calendar" ? <Legend viewYear={viewYear} viewMonth={viewMonth} /> : null}

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
                  onOpenDay={openDay}
                  onOpenReports={openReports}
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
                onJumpToday={() => openDay(new Date())}
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
            {activeTab === "activity" ? (
              <ActivityTimeline
                viewYear={viewYear}
                viewMonth={viewMonth}
                onPrevMonth={() => goToMonth(-1)}
                onNextMonth={() => goToMonth(1)}
              />
            ) : null}
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

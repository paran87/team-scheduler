"use client";

import { useState } from "react";
import { shiftMonth } from "@/lib/calendar";
import { ActivityNotesProvider } from "./ActivityNotesProvider";
import { AdminTopBar } from "./AdminTopBar";
import { Legend } from "./Legend";
import { CalendarGrid } from "./CalendarGrid";
import { AdminDetailPanel } from "./AdminDetailPanel";

export function BackendConsole() {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  function closePanel() {
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
    setPanelOpen(false);
    setSelectedDay(null);
  }

  return (
    <ActivityNotesProvider>
      <AdminTopBar />

      <Legend hint="Click any date to edit schedule" />

      <main>
        <div className="page">
          <div className="layout">
            <CalendarGrid
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDay={selectedDay}
              onSelectDay={selectDay}
              onPrevMonth={() => goToMonth(-1)}
              onNextMonth={() => goToMonth(1)}
            />
            <AdminDetailPanel
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDay={selectedDay}
              open={panelOpen}
              onClose={closePanel}
            />
          </div>
        </div>
      </main>

      <div className={`backdrop${panelOpen ? " show" : ""}`} onClick={closePanel} role="presentation" />
    </ActivityNotesProvider>
  );
}

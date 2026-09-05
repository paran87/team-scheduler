"use client";

import { useMemo } from "react";
import { findNote, toDateKey, type ActivityNote } from "@/lib/activity-notes";
import { membersForDate } from "@/lib/activity-composition";
import { DAY_NAMES, MONTH_NAMES } from "@/lib/schedule-data";
import { buildVisibleDayMap } from "@/lib/schedule-merge";
import type { BlockTeam, ScheduleBlock } from "@/lib/types";
import { useActivityNotes } from "./ActivityNotesProvider";
import { TeamCompositionCard } from "./TeamCompositionCard";

type DayCompositionViewProps = {
  year: number;
  month: number;
  day: number;
  onBack: () => void;
};

function personnelCount(team: BlockTeam, dateKey: string, notes: ActivityNote[]) {
  return membersForDate(team, dateKey, notes).members.length;
}

export function DayCompositionView({ year, month, day, onBack }: DayCompositionViewProps) {
  const { notes } = useActivityNotes();
  const dateKey = toDateKey(year, month, day);
  const dow = new Date(year, month, day).getDay();

  const teams = useMemo(() => {
    const map = buildVisibleDayMap(year, month, notes);
    const blocks = map[day] ?? [];
    const seen = new Set<BlockTeam>();
    const list: Array<{ team: BlockTeam; block: ScheduleBlock }> = [];
    for (const block of blocks) {
      if (seen.has(block.team)) continue;
      seen.add(block.team);
      list.push({ team: block.team, block });
    }
    for (const note of notes) {
      if (note.hidden || note.date !== dateKey || seen.has(note.team)) continue;
      if (!note.members?.length && !note.location && !note.activity && !note.event) continue;
      seen.add(note.team);
      list.push({
        team: note.team,
        block: {
          team: note.team,
          start: day,
          end: day,
          place: note.location || undefined,
          event: note.event || undefined,
          activity: note.activity || undefined,
        },
      });
    }
    return list.sort((a, b) => a.team.localeCompare(b.team));
  }, [dateKey, day, month, notes, year]);

  return (
    <div className="day-composition">
      <button type="button" className="admin-back-btn" onClick={onBack}>
        ← Back to overview
      </button>

      <div className="section-heading">
        <h2>Team composition</h2>
        <p>
          {DAY_NAMES[dow]}, {MONTH_NAMES[month]} {day}, {year} · Personnel assigned for today&apos;s activities
        </p>
      </div>

      {teams.length ? (
        <div className="day-composition-stack">
          {teams.map(({ team, block }) => {
            const { members, custom, note } = membersForDate(team, dateKey, notes);
            const location = block.place || block.event || note?.location || "—";
            return (
              <TeamCompositionCard
                key={team}
                team={team}
                members={members}
                location={location}
                custom={custom}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty-panel overview-empty">
          <span className="emoji">👥</span>
          No teams are assigned for today.
        </div>
      )}
    </div>
  );
}

export function countAssignedPersonnel(blocks: ScheduleBlock[], dateKey: string, notes: ActivityNote[]) {
  const teams = new Set(blocks.map((block) => block.team));
  for (const note of notes) {
    if (note.hidden || note.date !== dateKey) continue;
    if (!note.members?.length && !note.location && !note.activity && !note.event) continue;
    teams.add(note.team);
  }
  return [...teams].reduce((sum, team) => sum + personnelCount(team, dateKey, notes), 0);
}

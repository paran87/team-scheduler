"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { useActivityNotes } from "./ActivityNotesProvider";
import { useTeamRoster } from "./TeamRosterProvider";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";
import { personInitials } from "@/lib/team-roster";
import type { TeamKey } from "@/lib/types";

type LegendProps = {
  hint?: string;
  viewYear?: number;
  viewMonth?: number;
};

/* ── per-team member dropdown ─────────────────────────────────── */
type TeamDropdownProps = {
  team: TeamKey;
  label: string;
  dotColor: string;
  fieldDays?: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
};

function TeamMemberDropdown({ team, label, dotColor, fieldDays, isOpen, onToggle, onClose }: TeamDropdownProps) {
  const { rosterFor } = useTeamRoster();
  const roster = rosterFor(team);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, onClose]);

  const allPeople = [{ ...roster.lead, isLead: true }, ...roster.members.map((m) => ({ ...m, isLead: false }))];

  return (
    <div className="legend-item-wrap" ref={wrapRef}>
      <TeamLink team={team} className="legend-item team-nav-link">
        <span className="dot" style={{ background: dotColor }} />
        {label}
        <TeamAvatar teamKey={team} size={36} />
        {fieldDays != null ? <em className="legend-count">{fieldDays}d</em> : null}
      </TeamLink>
      {/* Chevron toggle – separate from the nav link so navigation still works */}
      <button
        type="button"
        className={`legend-members-btn${isOpen ? " open" : ""}`}
        onClick={onToggle}
        title={isOpen ? "Hide members" : "Show members"}
        aria-expanded={isOpen}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        /* Invisible full-screen tap-to-close backdrop (mobile) */
        <>
        <div className="lmp-backdrop" onClick={onClose} aria-hidden="true" />
        <div className="legend-members-panel">
          <div className="lmp-header">
            <span className="lmp-title">{label}</span>
            <span className="lmp-count">{allPeople.length} member{allPeople.length !== 1 ? "s" : ""}</span>
          </div>
          <ul className="lmp-list">
            {allPeople.map((person, i) => (
              <li key={person.id ?? `${team}-${i}`} className={`lmp-person${person.isLead ? " lmp-lead" : ""}`}>
                {person.photo ? (
                  <img className="lmp-photo" src={person.photo} alt={person.name} />
                ) : (
                  <span className="lmp-initials" style={{ background: dotColor }}>
                    {personInitials(person.name)}
                  </span>
                )}
                <div className="lmp-info">
                  <span className="lmp-name">{person.name}</span>
                  <span className="lmp-role">{person.title}</span>
                </div>
                {person.isLead && <span className="lmp-badge" style={{ background: dotColor }}>Lead</span>}
              </li>
            ))}
          </ul>
        </div>
        </>
      )}
    </div>
  );
}

/* ── Legend ───────────────────────────────────────────────────── */
export function Legend({ hint = "Click any date for details", viewYear, viewMonth }: LegendProps) {
  const { notes } = useActivityNotes();
  const monthly = useMemo(
    () => (viewYear != null && viewMonth != null ? buildMonthlyReport(viewYear, viewMonth, notes) : null),
    [viewYear, viewMonth, notes],
  );

  const [openTeam, setOpenTeam] = useState<TeamKey | null>(null);
  const toggle = useCallback((team: TeamKey) => setOpenTeam((prev) => (prev === team ? null : team)), []);
  const close = useCallback(() => setOpenTeam(null), []);

  return (
    <div className="legend">
      <TeamMemberDropdown
        team="usec"
        label="Team USEC"
        dotColor="var(--usec)"
        fieldDays={monthly?.teams[0]?.fieldDays}
        isOpen={openTeam === "usec"}
        onToggle={() => toggle("usec")}
        onClose={close}
      />
      <TeamMemberDropdown
        team="b"
        label="Team B"
        dotColor="var(--teamb)"
        fieldDays={monthly?.teams[1]?.fieldDays}
        isOpen={openTeam === "b"}
        onToggle={() => toggle("b")}
        onClose={close}
      />
      <TeamMemberDropdown
        team="a"
        label="Team A"
        dotColor="var(--teama)"
        fieldDays={monthly?.teams[2]?.fieldDays}
        isOpen={openTeam === "a"}
        onToggle={() => toggle("a")}
        onClose={close}
      />
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--special)" }} /> Special Event
        {monthly ? <em className="legend-count">{monthly.specialEvents.length}</em> : null}
      </div>
      <div className="legend-item is-hint">
        <span className="dot" style={{ background: "#111", opacity: 0.3 }} /> {hint}
      </div>
    </div>
  );
}

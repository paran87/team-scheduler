"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAM_META } from "@/lib/schedule-data";
import { TEAM_ASSIGNMENTS, TEAM_ASSIGNMENT_ORDER, groupRowsByRegion } from "@/lib/team-assignments";
import type { TeamFilter, TeamKey } from "@/lib/types";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";

type TeamAssignmentPanelProps = {
  focusTeam?: TeamFilter;
};

const FILTERS: { id: TeamFilter; label: string }[] = [
  { id: "all", label: "All Teams" },
  { id: "a", label: "Team A" },
  { id: "b", label: "Team B" },
  { id: "usec", label: "Team USEC" },
];

export function TeamAssignmentPanel({ focusTeam = "all" }: TeamAssignmentPanelProps) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>(focusTeam);

  useEffect(() => {
    setTeamFilter(focusTeam);
  }, [focusTeam]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return TEAM_ASSIGNMENT_ORDER.map((team) => {
      const group = TEAM_ASSIGNMENTS.find((item) => item.team === team);
      if (!group) return null;
      if (teamFilter !== "all" && teamFilter !== team) return null;

      const rows = needle
        ? group.rows.filter((row) =>
            [row.region, row.location, row.official].join(" ").toLowerCase().includes(needle),
          )
        : group.rows;

      if (!rows.length) return null;
      return { team, rows };
    }).filter((group): group is { team: TeamKey; rows: typeof TEAM_ASSIGNMENTS[number]["rows"] } => group !== null);
  }, [query, teamFilter]);

  const totalRows = TEAM_ASSIGNMENTS.reduce((sum, group) => sum + group.rows.length, 0);
  const visibleRows = filteredGroups.reduce((sum, group) => sum + group.rows.length, 0);

  return (
    <>
      <div className="section-heading">
        <h2>Team Assignments</h2>
        <p>Regional coverage, locations, and assigned officials for each field team.</p>
      </div>

      <div className="assignment-toolbar">
        <div className="assignment-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              className={`assignment-filter${teamFilter === filter.id ? " active" : ""}${filter.id !== "all" ? ` team-${filter.id}` : ""}`}
              onClick={() => setTeamFilter(filter.id)}
            >
              {filter.id !== "all" ? <TeamAvatar teamKey={filter.id} size={26} /> : null}
              {filter.label}
            </button>
          ))}
        </div>
        <label className="assignment-search">
          <span className="assignment-search-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search region, location, or official"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <p className="assignment-count">
        Showing {visibleRows} of {totalRows} assignments
      </p>

      {filteredGroups.length ? (
        <div className="assignment-stack">
          {filteredGroups.map((group) => {
            const meta = TEAM_META[group.team];
            const regionCount = new Set(group.rows.map((row) => row.region)).size;

            return (
              <section
                key={group.team}
                id={`assignment-${group.team}`}
                className={`assignment-card team-${group.team}`}
              >
                <header className="assignment-card-header">
                  <TeamLink team={group.team} className="assignment-card-title team-nav-link">
                    <span className={`team-chip ${meta.chipSolid}`}>{meta.label}</span>
                    <TeamAvatar teamKey={group.team} size={42} />
                  </TeamLink>
                  <p>
                    {group.rows.length} location{group.rows.length === 1 ? "" : "s"} · {regionCount} region
                    {regionCount === 1 ? "" : "s"}
                  </p>
                </header>
                <div className="assignment-table-wrap">
                  <table className="assignment-table">
                    <thead>
                      <tr>
                        <th>Region</th>
                        <th>Location</th>
                        <th>Official</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRowsByRegion(group.rows).map((regionGroup) =>
                        regionGroup.rows.map((row, index) => (
                          <tr key={`${regionGroup.region}-${row.location}-${index}`}>
                            {index === 0 ? (
                              <td className="assignment-region" rowSpan={regionGroup.rows.length}>
                                {regionGroup.region}
                              </td>
                            ) : null}
                            <td className="assignment-location">{row.location}</td>
                            <td className="assignment-official">{row.official || "—"}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel">
          <span className="emoji">🗺️</span>
          No assignments match that search.
        </div>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { teamLabel } from "@/lib/activity-notes";
import { buildMonthlyReport, type ReportFilter } from "@/lib/monthly-report";
import { useActivityNotes } from "./ActivityNotesProvider";
import { TeamAssignmentPanel } from "./TeamAssignmentPanel";
import { TeamLink } from "./TeamLink";

type ReportsPanelProps = {
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const FILTERS: { id: ReportFilter; label: string }[] = [
  { id: "all", label: "All deployments" },
  { id: "posted", label: "MOM posted" },
  { id: "missing", label: "MOM missing" },
];

export function ReportsPanel({ viewYear, viewMonth, onPrevMonth, onNextMonth }: ReportsPanelProps) {
  const { notes, loading } = useActivityNotes();
  const [filter, setFilter] = useState<ReportFilter>("all");
  const report = useMemo(() => buildMonthlyReport(viewYear, viewMonth, notes), [notes, viewMonth, viewYear]);

  const rows = report.deploymentsList.filter((row) => {
    if (filter === "posted") return row.posted;
    if (filter === "missing") return !row.posted;
    return true;
  });

  const stats = [
    { label: "Field days", value: report.fieldDays, hint: "Days with a team in the field" },
    { label: "Deployments", value: report.deployments, hint: "Assignments this month" },
    { label: "Locations", value: report.locations, hint: "Sites and areas covered" },
    { label: "Personnel", value: report.uniquePersonnel, hint: "People assigned this month" },
    { label: "MOM posted", value: `${report.reportsPosted}/${report.deployments || 0}`, hint: "Activity reports on file" },
  ];

  return (
    <div className="reports-panel">
      <div className="section-heading reports-heading">
        <div>
          <h2>
            Monthly field report
            <span className="reports-live">Live</span>
          </h2>
          <p>
            A recap of {MONTH_NAMES[viewMonth]} {viewYear} from the dashboard, calendar, and activity log.
          </p>
        </div>
        <div className="calendar-month-nav reports-month-nav">
          <button type="button" className="calendar-nav-btn" title="Previous month" aria-label="Previous month" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h3 className="calendar-month-title">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button type="button" className="calendar-nav-btn" title="Next month" aria-label="Next month" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="reports-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="overview-stat">
            <div>
              <strong>{loading ? "…" : stat.value}</strong>
              <span>{stat.label}</span>
              <em className="reports-stat-hint">{stat.hint}</em>
            </div>
          </div>
        ))}
      </div>

      <section className="reports-section">
        <div className="section-heading">
          <h2>By team</h2>
          <p>How each team spent the month in the field.</p>
        </div>
        <div className="reports-team-grid">
          {report.teams.map((team) => {
            const meta = TEAM_META[team.team];
            return (
              <article key={team.team} className="reports-team-card">
                <header>
                  <TeamLink team={team.team} className="team-nav-link">
                    <span className="overview-team" style={{ background: meta.color }}>
                      {teamLabel(team.team)}
                    </span>
                  </TeamLink>
                </header>
                <dl>
                  <div>
                    <dt>Field days</dt>
                    <dd>{team.fieldDays}</dd>
                  </div>
                  <div>
                    <dt>Deployments</dt>
                    <dd>{team.deployments}</dd>
                  </div>
                  <div>
                    <dt>Locations</dt>
                    <dd>{team.locations}</dd>
                  </div>
                  <div>
                    <dt>MOM posted</dt>
                    <dd>
                      {team.reportsPosted}/{team.deployments || 0}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      {report.specialEvents.length ? (
        <p className="reports-special">
          Special events: {report.specialEvents.join(" · ")}
        </p>
      ) : null}

      <section className="reports-section">
        <div className="section-heading reports-table-heading">
          <div>
            <h2>Deployment register</h2>
            <p>Every assignment from the calendar, with duration and Activity Report/MOM status.</p>
          </div>
          <div className="reports-filters">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`reports-filter${filter === item.id ? " is-active" : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div className="overview-table-wrap">
            <table className="overview-table reports-table">
              <thead>
                <tr>
                  <th>Duration</th>
                  <th>Team</th>
                  <th>Location</th>
                  <th>Activity</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = TEAM_META[row.team];
                  return (
                    <tr key={row.key}>
                      <td className="overview-time">{row.duration}</td>
                      <td>
                        <span className="overview-team" style={{ background: meta.color }}>
                          {teamLabel(row.team)}
                        </span>
                      </td>
                      <td>{row.location}</td>
                      <td>{row.activity}</td>
                      <td>
                        {row.posted ? (
                          <Link href={row.reportHref} className="activity-report-link">
                            Activity Report/MOM
                          </Link>
                        ) : (
                          <span className="overview-status is-completed">Not posted</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel reports-empty">
            <span className="emoji">📊</span>
            {loading ? "Loading this month’s report…" : "No deployments match this filter."}
          </div>
        )}
      </section>

      <section className="reports-section">
        <div className="section-heading">
          <h2>Locations covered</h2>
          <p>Where teams were assigned this month.</p>
        </div>
        {report.locationList.length ? (
          <div className="overview-table-wrap">
            <table className="overview-table reports-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Teams</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {report.locationList.map((row) => (
                  <tr key={row.location}>
                    <td>{row.location}</td>
                    <td>
                      <span className="reports-team-pills">
                        {row.teams.map((team) => (
                          <span key={team} className="overview-team" style={{ background: TEAM_META[team].color }}>
                            {teamLabel(team)}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td>{row.coverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel reports-empty">
            <span className="emoji">📍</span>
            No locations logged for this month.
          </div>
        )}
      </section>

      <section className="reports-section reports-assignments">
        <TeamAssignmentPanel />
      </section>
    </div>
  );
}

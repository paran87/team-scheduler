"use client";

import { DAY_NAMES, MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { buildPerDayMap } from "@/lib/calendar";
import { getPlaceImage } from "@/lib/place-images";
import { TeamAvatar } from "./TeamAvatar";

type DetailPanelProps = {
  viewYear: number;
  viewMonth: number;
  selectedDay: number | null;
  open: boolean;
  onClose: () => void;
};

export function DetailPanel({
  viewYear,
  viewMonth,
  selectedDay,
  open,
  onClose,
}: DetailPanelProps) {
  if (!selectedDay) {
    return (
      <aside className={`detail-panel${open ? " open" : ""}`}>
        <div className="empty-icon">🗓️</div>
        <h3 style={{ margin: 0 }}>Select a date</h3>
        <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: 260, margin: 0 }}>
          Click on any date in the calendar to view team assignments, locations and events.
        </p>
      </aside>
    );
  }

  const perDay = buildPerDayMap(viewYear, viewMonth);
  const entries = perDay[selectedDay] ?? [];
  const dow = new Date(viewYear, viewMonth, selectedDay).getDay();
  const special = entries.find((e) => e.team === "special");

  return (
    <aside className={`detail-panel${open ? " open" : ""}`}>
      <div className="drag-handle" />
      <div className="detail-header">
        <div>
          <div className="detail-date-big">
            {MONTH_NAMES[viewMonth].slice(0, 3)} {selectedDay}
          </div>
          <div className="detail-date-sub">
            {DAY_NAMES[dow]} · {viewYear}
          </div>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close details">
          ✕
        </button>
      </div>

      {special ? (
        <div className="special-card">
          <div className="star">★</div>
          <div className="tag">Special Event</div>
          <div className="name">{special.event}</div>
        </div>
      ) : entries.length ? (
        entries.map((entry, index) => {
          if (entry.team === "special") return null;
          const meta = TEAM_META[entry.team];
          const placeImage = getPlaceImage(entry.place);
          const rangeText =
            entry.start !== entry.end
              ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${entry.start} – ${entry.end}`
              : "";

          return (
            <div key={`${entry.team}-${index}`} className="team-card">
              <div className={`team-photo ${meta.photoClass}`}>
                {placeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={placeImage}
                    alt=""
                    className="place-photo"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <div className="overlay" />
                <div>
                  <div className="pin" style={{ textAlign: "center" }}>
                    📍
                  </div>
                  <div className="loc-text">{entry.place}</div>
                </div>
              </div>
              <div className="team-body">
                <div className="team-name-row">
                  <span className={`team-chip ${meta.chipSolid}`}>{meta.label}</span>
                  <TeamAvatar teamKey={entry.team} size={40} />
                </div>
                <p className="team-place">{entry.place}</p>
                {entry.event ? <p className="team-event">{entry.event}</p> : null}
                {rangeText ? <p className="team-range">Duration: {rangeText}</p> : null}
              </div>
            </div>
          );
        })
      ) : (
        <div className="no-activity">
          <span className="emoji">🌤️</span>
          No scheduled activity for this date.
        </div>
      )}
    </aside>
  );
}

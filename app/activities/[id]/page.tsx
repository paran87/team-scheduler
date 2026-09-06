import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { ReportPhotoGallery } from "@/components/ReportPhotoGallery";
import {
  parseNoteId,
  scheduledEvent,
  scheduledLocation,
  teamLabel,
} from "@/lib/activity-notes";
import { readActivityNote, resolveReportImages } from "@/lib/activity-store";
import { BRAND_NAME } from "@/lib/brand";
import { DAY_NAMES, MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { homeTabHref } from "@/lib/tabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: string) {
  const parsed = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parsed) return date;
  return `${MONTH_NAMES[Number(parsed[2]) - 1]} ${Number(parsed[3])}, ${parsed[1]}`;
}

function weekdayName(date: string) {
  const parsed = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parsed) return "";
  const utc = new Date(Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3])));
  return DAY_NAMES[utc.getUTCDay()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseNoteId(decodeURIComponent(id));
  if (!parsed) return { title: "Activity Report/MOM" };
  return {
    title: `Activity Report/MOM · ${teamLabel(parsed.team)} · ${formatDate(parsed.date)}`,
    description: "Activity Report and Minutes of Meeting",
  };
}

export default async function ActivityReportPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const parsed = parseNoteId(id);
  if (!parsed) notFound();

  const note = await readActivityNote(id, { includeRoster: false });
  const images = await resolveReportImages(id, note);
  const location = (note?.location || scheduledLocation(parsed.date, parsed.team) || "").trim();
  const event = (note?.event || scheduledEvent(parsed.date, parsed.team) || "").trim();
  const activity = (note?.activity || "").trim();
  const report = (note?.remarks || "").trim();
  const meta = parsed.team === "special" ? null : TEAM_META[parsed.team];
  const back = { href: homeTabHref("activity"), label: "← Activities" };

  const teamColor = meta ? meta.color : "var(--special)";
  const teamName = meta ? meta.label : "Special Event";
  const place = location || event || teamLabel(parsed.team);
  const weekday = weekdayName(parsed.date);

  return (
    <div className="org-page report-page" style={{ "--pill": teamColor } as CSSProperties}>
      <header className="org-header report-header">
        <div className="report-header-fx" aria-hidden="true">
          <span className="report-orb is-indigo" />
          <span className="report-orb is-cyan" />
          <span className="report-orb is-amber" />
          <span className="report-header-grid" />
          <span className="report-wave is-back" />
          <span className="report-wave is-front" />
        </div>
        <div className="org-header-inner">
          <BackLink initialHref={back.href} initialLabel={back.label} />
          <div className="org-letterhead">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/dpwh-logo.png" alt="Department of Public Works and Highways" className="org-seal org-seal-dpwh" />
            <div className="org-header-text">
              <p className="org-kicker">Republic of the Philippines</p>
              <span className="report-letterhead-rule" aria-hidden="true" />
              <p className="org-agency">Department of Public Works and Highways</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/bagong-pilipinas.png" alt="Bagong Pilipinas" className="org-seal org-seal-bagong" />
          </div>
        </div>
      </header>

      <main className="org-main report-main">
        <section className="report-hero">
          <span className="report-hero-aura" aria-hidden="true" />
          <span className="report-hero-grid" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/oplan-kontra-baha.png" alt="" aria-hidden="true" className="report-hero-watermark" />

          <div className="report-hero-badge">
            <span className="report-hero-ring" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/oplan-kontra-baha.png" alt={BRAND_NAME} className="report-hero-mark" />
          </div>

          <div className="report-hero-copy">
            <p className="report-hero-eyebrow">
              <span className="report-hero-spark" aria-hidden="true" />
              Official field documentation
            </p>
            <h1 className="report-hero-title">
              Activity Report <span className="report-hero-slash">/</span> MOM
            </h1>
            <p className="report-hero-facts">
              {weekday ? <span>{weekday}</span> : null}
              <strong>{formatDate(parsed.date)}</strong>
              <span className="report-hero-place">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                {place}
              </span>
            </p>
          </div>

          <span className="report-hero-pill">
            <span className="report-hero-dot" aria-hidden="true" />
            {teamName}
          </span>
        </section>

        <article className="report-card">
          {location || (event && event !== location) || activity ? (
            <div className="report-meta">
              {location ? (
                <p className="is-location">
                  <span className="report-meta-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <strong>Location</strong>
                  <span>{location}</span>
                </p>
              ) : null}
              {event && event !== location ? (
                <p className="is-event">
                  <span className="report-meta-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M8 4.5v3M16 4.5v3M4.8 8.8h14.4M6.2 7.2h11.6A1.8 1.8 0 0 1 19.6 9v9.2a1.8 1.8 0 0 1-1.8 1.8H6.2A1.8 1.8 0 0 1 4.4 18.2V9a1.8 1.8 0 0 1 1.8-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <strong>Event</strong>
                  <span>{event}</span>
                </p>
              ) : null}
              {activity ? (
                <p className="is-activity">
                  <span className="report-meta-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 4.6h7.2L19 9.4v10a1.6 1.6 0 0 1-1.6 1.6H7A1.6 1.6 0 0 1 5.4 19.4V6.2A1.6 1.6 0 0 1 7 4.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M14.1 4.6V9h4.6M8.4 13h7.2M8.4 16.6h5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <strong>Activity</strong>
                  <span>{activity}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="report-body">
            <header className="report-section-head">
              <p className="report-section-eyebrow">
                <span className="report-section-dot" aria-hidden="true" />
                Field minutes
              </p>
              <h3>Activity Report / Minutes of Meeting</h3>
            </header>
            {report ? <div className="report-pre">{report}</div> : <p className="report-empty">No activity report has been posted yet.</p>}
          </section>

          <section className="report-photos">
            <header className="report-section-head">
              <p className="report-section-eyebrow">
                <span className="report-section-dot" aria-hidden="true" />
                {images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "Gallery"}
              </p>
              <h3>Photos</h3>
            </header>
            <ReportPhotoGallery images={images} />
          </section>
        </article>
      </main>
    </div>
  );
}

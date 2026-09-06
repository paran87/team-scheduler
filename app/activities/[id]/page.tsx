import { headers } from "next/headers";
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
import { backLinkFromReferer } from "@/lib/tabs";

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

  const note = await readActivityNote(id);
  const images = await resolveReportImages(id);
  const location = (note?.location || scheduledLocation(parsed.date, parsed.team) || "").trim();
  const event = (note?.event || scheduledEvent(parsed.date, parsed.team) || "").trim();
  const activity = (note?.activity || "").trim();
  const report = (note?.remarks || "").trim();
  const meta = parsed.team === "special" ? null : TEAM_META[parsed.team];
  const hdrs = await headers();
  const back = backLinkFromReferer(hdrs.get("referer"), hdrs.get("host"));

  const teamColor = meta ? meta.color : "var(--special)";
  const teamName = meta ? meta.label : "Special Event";
  const place = location || event || teamLabel(parsed.team);
  const weekday = weekdayName(parsed.date);

  return (
    <div className="org-page report-page">
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
        <section className="report-hero" style={{ "--pill": teamColor } as CSSProperties}>
          <span className="report-hero-aura" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/oplan-kontra-baha.png" alt="" aria-hidden="true" className="report-hero-watermark" />

          <div className="report-hero-badge">
            <span className="report-hero-ring" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/oplan-kontra-baha.png" alt={BRAND_NAME} className="report-hero-mark" />
          </div>

          <p className="report-hero-eyebrow">
            <span className="report-hero-spark" aria-hidden="true" />
            Official Field Documentation
          </p>

          <h1 className="report-hero-title">
            <span>Activity Report</span>
            <span className="report-hero-slash" aria-hidden="true">/</span>
            <span>MOM</span>
          </h1>

          <span className="report-hero-pill">
            <span className="report-hero-dot" aria-hidden="true" />
            {teamName}
          </span>

          <div className="report-hero-date">
            {weekday ? <p className="report-hero-weekday">{weekday}</p> : null}
            <h2>{formatDate(parsed.date)}</h2>
          </div>

          <p className="report-hero-place">
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
          </p>

          <span className="report-hero-rule" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </section>

        <article className="report-card">
          <div className="report-meta">
            {location ? (
              <p>
                <strong>Location</strong>
                <span>{location}</span>
              </p>
            ) : null}
            {event && event !== location ? (
              <p>
                <strong>Event</strong>
                <span>{event}</span>
              </p>
            ) : null}
            {activity ? (
              <p>
                <strong>Activity</strong>
                <span className="report-pre">{activity}</span>
              </p>
            ) : null}
          </div>

          <section className="report-body">
            <h3>Activity Report / Minutes of Meeting</h3>
            {report ? <div className="report-pre">{report}</div> : <p className="report-empty">No activity report has been posted yet.</p>}
          </section>

          <section className="report-photos">
            <h3>Photos</h3>
            <ReportPhotoGallery images={images} />
          </section>
        </article>
      </main>
    </div>
  );
}

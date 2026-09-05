import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import {
  parseNoteId,
  scheduledEvent,
  scheduledLocation,
  teamLabel,
} from "@/lib/activity-notes";
import { readActivityNote, resolveReportImages } from "@/lib/activity-store";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";

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

  return (
    <div className="org-page report-page">
      <header className="org-header">
        <div className="org-header-inner">
          <Link href="/" className="org-back">
            ← Dashboard
          </Link>
          <div className="org-letterhead">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/dpwh-logo.png" alt="Department of Public Works and Highways" className="org-seal org-seal-dpwh" />
            <div className="org-header-text">
              <p className="org-kicker">Republic of the Philippines</p>
              <p className="org-agency">Department of Public Works and Highways</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/bagong-pilipinas.png" alt="Bagong Pilipinas" className="org-seal org-seal-bagong" />
          </div>
        </div>
      </header>

      <main className="org-main report-main">
        <div className="org-hero">
          <BrandLogo />
          <h1>Activity Report / MOM</h1>
          {meta ? (
            <span className="org-team-pill" style={{ background: meta.color }}>
              {meta.label}
            </span>
          ) : (
            <span className="org-team-pill" style={{ background: "var(--special)" }}>
              Special Event
            </span>
          )}
          <h2>{formatDate(parsed.date)}</h2>
          <p>{location || event || teamLabel(parsed.team)}</p>
        </div>

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
            {images.length ? (
              <ul className="report-photo-grid">
                {images.map((image) => (
                  <li key={image.path}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.name} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="report-empty">No photos uploaded yet.</p>
            )}
          </section>
        </article>
      </main>
    </div>
  );
}

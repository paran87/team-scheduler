import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TeamCompositionCard } from "@/components/TeamCompositionCard";
import { membersForDate } from "@/lib/activity-composition";
import { isBlockTeam, parseDateKey, scheduledEvent, scheduledLocation, teamLabel } from "@/lib/activity-notes";
import { readActivityNotes } from "@/lib/activity-store";
import { DAY_NAMES, MONTH_NAMES } from "@/lib/schedule-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ date: string; team: string }>;
};

function formatDate(date: string) {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  const dow = new Date(parsed.year, parsed.monthIndex, parsed.day).getDay();
  return `${DAY_NAMES[dow]}, ${MONTH_NAMES[parsed.monthIndex]} ${parsed.day}, ${parsed.year}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date, team } = await params;
  if (!parseDateKey(date) || !isBlockTeam(team)) return { title: "Team composition" };
  return {
    title: `Team composition · ${teamLabel(team)} · ${formatDate(date)}`,
    description: `Personnel assigned to ${teamLabel(team)} on ${formatDate(date)}`,
  };
}

export default async function DayTeamCompositionPage({ params }: PageProps) {
  const { date, team } = await params;
  if (!parseDateKey(date) || !isBlockTeam(team)) notFound();

  const notes = await readActivityNotes();
  const { members, custom, note } = membersForDate(team, date, notes);
  const location = (note?.location || scheduledLocation(date, team) || note?.event || scheduledEvent(date, team) || "").trim();

  return (
    <main>
      <div className="page">
        <div className="day-composition">
          <Link href="/" className="admin-back-btn">
            ← Back to dashboard
          </Link>

          <div className="section-heading">
            <h2>Team composition</h2>
            <p>
              {formatDate(date)} · Personnel assigned for this date
            </p>
          </div>

          <div className="day-composition-stack">
            <TeamCompositionCard team={team} members={members} location={location} custom={custom} />
          </div>
        </div>
      </div>
    </main>
  );
}

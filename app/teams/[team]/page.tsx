import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { OrgChart } from "@/components/OrgChart";
import { OFFICE_NAME, TEAM_ROSTERS, isTeamKey } from "@/lib/team-roster";
import { TEAM_META } from "@/lib/schedule-data";
import type { TeamKey } from "@/lib/types";

type TeamPageProps = {
  params: Promise<{ team: string }>;
};

export function generateStaticParams() {
  return [{ team: "usec" }, { team: "b" }, { team: "a" }];
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { team } = await params;
  if (!isTeamKey(team)) return { title: "Team Composition" };
  return {
    title: `${TEAM_ROSTERS[team].label} · ${OFFICE_NAME}`,
    description: `Organizational chart for ${TEAM_ROSTERS[team].label}`,
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { team } = await params;
  if (!isTeamKey(team)) notFound();

  const roster = TEAM_ROSTERS[team];
  const otherTeams = (Object.keys(TEAM_ROSTERS) as TeamKey[]).filter((key) => key !== team);

  return (
    <div className={`org-page team-${team}`}>
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

      <main className="org-main">
        <div className="org-hero">
          <BrandLogo />
          <h1>{OFFICE_NAME}</h1>
          <span className="org-team-pill" style={{ background: roster.color }}>
            {roster.label}
          </span>
          <h2>Team Composition</h2>
          <p>Organizational chart of personnel assigned to {roster.label}.</p>
        </div>

        <OrgChart roster={roster} />

        <nav className="org-other-teams" aria-label="Other teams">
          {otherTeams.map((key) => (
            <Link key={key} href={`/teams/${key}`} className="org-other-link">
              View {TEAM_META[key].label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

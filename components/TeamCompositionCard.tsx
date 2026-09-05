import { teamLabel, type ActivityMember } from "@/lib/activity-notes";
import { TEAM_META } from "@/lib/schedule-data";
import { personInitials } from "@/lib/team-roster";
import type { BlockTeam, TeamKey } from "@/lib/types";
import { TeamAvatar } from "./TeamAvatar";

type TeamCompositionCardProps = {
  team: BlockTeam;
  members: ActivityMember[];
  location: string;
  custom: boolean;
};

export function TeamCompositionCard({ team, members, location, custom }: TeamCompositionCardProps) {
  const meta = team === "special" ? null : TEAM_META[team];

  return (
    <section className="day-composition-card">
      <header className="day-composition-header">
        <div className="day-composition-team">
          <span className="overview-team" style={{ background: meta?.color ?? "var(--special)" }}>
            {teamLabel(team)}
          </span>
          {team !== "special" ? <TeamAvatar teamKey={team as TeamKey} size={40} /> : <span className="admin-special-star">★</span>}
        </div>
        <div className="day-composition-summary">
          <strong>
            {members.length} personnel
          </strong>
          <span>
            {location || "—"}
            {custom ? " · Custom for this date" : " · Original team composition"}
          </span>
        </div>
      </header>

      {members.length ? (
        <ul className="admin-member-list">
          {members.map((member) => (
            <li key={member.id} className="admin-member-row">
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo} alt="" className="admin-member-photo" />
              ) : (
                <span className="admin-member-fallback">{personInitials(member.name)}</span>
              )}
              <div className="admin-member-meta">
                <strong>{member.name}</strong>
                <span>{member.title || "Team Member"}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-member-empty">No personnel listed for this team on this date.</p>
      )}
    </section>
  );
}

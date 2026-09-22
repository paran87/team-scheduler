import { blockTeamVisual, teamLabel, type ActivityMember } from "@/lib/activity-notes";
import { isTeamKey, personInitials } from "@/lib/team-roster";
import type { BlockTeam } from "@/lib/types";
import { TeamAvatar } from "./TeamAvatar";

type TeamCompositionCardProps = {
  team: BlockTeam;
  members: ActivityMember[];
  location: string;
  custom: boolean;
};

export function TeamCompositionCard({ team, members, location, custom }: TeamCompositionCardProps) {
  const meta = blockTeamVisual(team);
  const isGuest = team === "guest";

  return (
    <section className="day-composition-card">
      <header className="day-composition-header">
        <div className="day-composition-team">
          <span className="overview-team" style={{ background: meta.color }}>
            {teamLabel(team)}
          </span>
          {isTeamKey(team) ? (
            <TeamAvatar teamKey={team} size={40} />
          ) : team === "special" ? (
            <span className="admin-special-star">★</span>
          ) : (
            <span className="admin-guest-mark">{members[0] ? personInitials(members[0].name) : "•"}</span>
          )}
        </div>
        <div className="day-composition-summary">
          <strong>
            {members.length} personnel
          </strong>
          <span>
            {location || "—"}
            {isGuest
              ? members.length === 1
                ? " · Independent assignment"
                : " · Independent people for this date"
              : custom
                ? members.length === 1
                  ? " · Assigned person for this date"
                  : " · Custom for this date"
                : " · Original team composition"}
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
                <span>{member.title || (isGuest ? "Independent" : "Team Member")}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-member-empty">
          {isGuest ? "No independent people listed for this date." : "No personnel listed for this team on this date."}
        </p>
      )}
    </section>
  );
}

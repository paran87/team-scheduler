import { PersonCard } from "./PersonCard";
import type { TeamRoster } from "@/lib/team-roster";

type OrgChartProps = {
  roster: TeamRoster;
};

export function OrgChart({ roster }: OrgChartProps) {
  const railWidth =
    roster.members.length < 2 ? 0 : (roster.members.length - 1) * 248;

  return (
    <div className="org-chart">
      <PersonCard person={roster.lead} accent={roster.color} featured />
      <div className="org-stem" style={{ background: roster.color }} />
      {roster.members.length ? (
        <>
          <div
            className="org-rail"
            style={{ width: railWidth, background: roster.color, opacity: railWidth ? 1 : 0 }}
          />
          <div className="org-members">
            {roster.members.map((person) => (
              <div key={person.name} className="org-member-col">
                <div className="org-member-stem" style={{ background: roster.color }} />
                <PersonCard person={person} accent={roster.color} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { PersonCard } from "./PersonCard";
import type { TeamPerson, TeamRoster } from "@/lib/team-roster";

type OrgChartProps = {
  roster: TeamRoster;
  extraSlot?: ReactNode;
  onRemoveExtra?: (person: TeamPerson) => void;
};

export function OrgChart({ roster, extraSlot, onRemoveExtra }: OrgChartProps) {
  const columnCount = roster.members.length + (extraSlot ? 1 : 0);
  const railWidth = columnCount < 2 ? 0 : (columnCount - 1) * 248;

  return (
    <div className="org-chart">
      <PersonCard person={roster.lead} accent={roster.color} featured />
      <div className="org-stem" style={{ background: roster.color }} />
      {columnCount ? (
        <>
          <div
            className="org-rail"
            style={{ width: railWidth, background: roster.color, opacity: railWidth ? 1 : 0 }}
          />
          <div className="org-members">
            {roster.members.map((person, index) => (
              <div key={person.id ?? `${person.name}-${index}`} className="org-member-col">
                <div className="org-member-stem" style={{ background: roster.color }} />
                <PersonCard
                  person={person}
                  accent={roster.color}
                  onRemove={person.extra && onRemoveExtra ? () => onRemoveExtra(person) : undefined}
                />
              </div>
            ))}
            {extraSlot ? (
              <div className="org-member-col">
                <div className="org-member-stem" style={{ background: roster.color }} />
                {extraSlot}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

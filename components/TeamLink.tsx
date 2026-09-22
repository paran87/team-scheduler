import type { ReactNode } from "react";
import Link from "next/link";
import { activityCompositionPath } from "@/lib/activity-composition";
import { isTeamKey } from "@/lib/team-roster";
import type { BlockTeam } from "@/lib/types";

type TeamLinkProps = {
  team: BlockTeam;
  date?: string;
  className?: string;
  children: ReactNode;
};

export function TeamLink({ team, date, className, children }: TeamLinkProps) {
  const href = date ? activityCompositionPath(date, team) : isTeamKey(team) ? `/teams/${team}` : undefined;
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className ?? "team-nav-link"}>
      {children}
    </Link>
  );
}

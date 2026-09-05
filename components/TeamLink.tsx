import type { ReactNode } from "react";
import Link from "next/link";
import { activityCompositionPath } from "@/lib/activity-composition";
import type { TeamKey } from "@/lib/types";

type TeamLinkProps = {
  team: TeamKey;
  date?: string;
  className?: string;
  children: ReactNode;
};

export function TeamLink({ team, date, className, children }: TeamLinkProps) {
  const href = date ? activityCompositionPath(date, team) : `/teams/${team}`;
  return (
    <Link href={href} className={className ?? "team-nav-link"}>
      {children}
    </Link>
  );
}

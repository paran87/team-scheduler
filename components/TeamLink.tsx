import type { ReactNode } from "react";
import Link from "next/link";
import type { TeamKey } from "@/lib/types";

type TeamLinkProps = {
  team: TeamKey;
  className?: string;
  children: ReactNode;
};

export function TeamLink({ team, className, children }: TeamLinkProps) {
  return (
    <Link href={`/teams/${team}`} className={className ?? "team-nav-link"}>
      {children}
    </Link>
  );
}

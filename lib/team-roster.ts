import { TEAM_META } from "./schedule-data";
import type { TeamKey } from "./types";

export type TeamPerson = {
  name: string;
  title: string;
  photo?: string;
};

export type TeamRoster = {
  team: TeamKey;
  label: string;
  color: string;
  lead: TeamPerson;
  members: TeamPerson[];
};

export const OFFICE_NAME = "Office of the Undersecretary for Special Concerns";

export const TEAM_ROSTERS: Record<TeamKey, TeamRoster> = {
  usec: {
    team: "usec",
    label: TEAM_META.usec.label,
    color: TEAM_META.usec.color,
    lead: {
      name: "Usec. Charles T. Calima",
      title: "Undersecretary for Special Concerns",
      photo: TEAM_META.usec.avatar,
    },
    members: [
      { name: "Vincent Jan Aurelio Nicer", title: "Team Member", photo: "/assets/vincent-nicer.png" },
      { name: "Kathlene Cruz", title: "Team Member", photo: "/assets/kathlene-cruz.png" },
      { name: "Christopher", title: "Team Member" },
    ],
  },
  b: {
    team: "b",
    label: TEAM_META.b.label,
    color: TEAM_META.b.color,
    lead: {
      name: "Raymond Mendoza",
      title: "Team Lead",
      photo: TEAM_META.b.avatar,
    },
    members: [
      { name: "Edison Chubby Del Rosario", title: "Team Member", photo: "/assets/edison-del-rosario.png" },
      { name: "Jener Braga", title: "Team Member", photo: "/assets/jener-braga.png" },
    ],
  },
  a: {
    team: "a",
    label: TEAM_META.a.label,
    color: TEAM_META.a.color,
    lead: {
      name: "Atty. Rose Ann Dalonos",
      title: "Team Lead",
      photo: TEAM_META.a.avatar,
    },
    members: [
      { name: "Dindo Macabante", title: "Team Member", photo: "/assets/dindo-macabante.png" },
      { name: "Roxanne Ferrer", title: "Team Member", photo: "/assets/roxanne-ferrer.png" },
      { name: "Bea", title: "Team Member" },
    ],
  },
};

export function isTeamKey(value: string): value is TeamKey {
  return value === "usec" || value === "b" || value === "a";
}

export function personInitials(name: string) {
  const cleaned = name.replace(/^(Usec\.|Atty\.)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

import { TEAM_META } from "./schedule-data";
import type { ActivityMember } from "./activity-notes";
import type { BlockTeam, TeamKey } from "./types";

export type RosterPerson = ActivityMember & { team: TeamKey };

export type TeamPerson = {
  id?: string;
  name: string;
  title: string;
  photo?: string;
  extra?: boolean;
};

export type ExtraRosterMember = {
  id: string;
  team: TeamKey;
  name: string;
  title: string;
  photo?: string;
  photoPath?: string;
};

export const TEAM_ROSTER_CHANNEL = "team-roster";
export const TEAM_KEYS: TeamKey[] = ["usec", "b", "a"];

let extraRosterCache: ExtraRosterMember[] = [];

export function extraRosterMembers() {
  return extraRosterCache;
}

export function setExtraRosterMembers(members: ExtraRosterMember[]) {
  extraRosterCache = members;
}

export function extraMemberRosterId(team: TeamKey, id: string) {
  return `${team}__extra-${id}`;
}

export function parseExtraMemberRosterId(value: string) {
  for (const team of TEAM_KEYS) {
    const prefix = `${team}__extra-`;
    if (value.startsWith(prefix)) {
      return { team, id: value.slice(prefix.length) };
    }
  }
  return null;
}

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

export function extrasForTeam(team: TeamKey, extras: ExtraRosterMember[] = extraRosterCache) {
  return extras.filter((member) => member.team === team);
}

export function mergeTeamRoster(roster: TeamRoster, extras: ExtraRosterMember[] = extraRosterCache): TeamRoster {
  const extraPeople = extrasForTeam(roster.team, extras).map((member) => ({
    id: extraMemberRosterId(member.team, member.id),
    name: member.name,
    title: member.title,
    ...(member.photo ? { photo: member.photo } : {}),
    extra: true,
  }));
  return { ...roster, members: [...roster.members, ...extraPeople] };
}

/** Flat base roster for a team. Used as the starting point for activity-specific composition. */
export function baseActivityMembers(
  team: BlockTeam,
  extras: ExtraRosterMember[] = extraRosterCache,
): ActivityMember[] {
  if (team === "special" || team === "guest") return [];
  const roster = TEAM_ROSTERS[team];
  return [
    {
      id: `${team}__lead`,
      name: roster.lead.name,
      title: roster.lead.title,
      ...(roster.lead.photo ? { photo: roster.lead.photo } : {}),
    },
    ...roster.members.map((member, index) => ({
      id: `${team}__member-${index}`,
      name: member.name,
      title: member.title,
      ...(member.photo ? { photo: member.photo } : {}),
    })),
    ...extrasForTeam(team, extras).map((member) => ({
      id: extraMemberRosterId(member.team, member.id),
      name: member.name,
      title: member.title,
      ...(member.photo ? { photo: member.photo } : {}),
    })),
  ];
}

export function toActivityMember(person: Pick<ActivityMember, "id" | "name" | "title" | "photo">): ActivityMember {
  return {
    id: person.id,
    name: person.name,
    ...(person.title ? { title: person.title } : {}),
    ...(person.photo ? { photo: person.photo } : {}),
  };
}

export function allRosterPeople(extras: ExtraRosterMember[] = extraRosterCache): RosterPerson[] {
  return TEAM_KEYS.flatMap((team) =>
    baseActivityMembers(team, extras).map((member) => ({ ...member, team })),
  );
}

export function findRosterPerson(id: string, extras: ExtraRosterMember[] = extraRosterCache): RosterPerson | undefined {
  return allRosterPeople(extras).find((person) => person.id === id);
}

export function shortFirstName(name: string) {
  const cleaned = name.replace(/^(Usec\.|Atty\.)\s+/i, "").trim();
  return cleaned.split(/\s+/).filter(Boolean)[0] || name;
}

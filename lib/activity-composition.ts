import { findNote, type ActivityMember, type ActivityNote } from "./activity-notes";
import { baseActivityMembers, shortFirstName } from "./team-roster";
import type { BlockTeam } from "./types";

export function activityCompositionPath(date: string, team: BlockTeam) {
  return `/days/${date}/${team}`;
}

export function membersForDate(team: BlockTeam, dateKey: string, notes: ActivityNote[]): {
  members: ActivityMember[];
  custom: boolean;
  note?: ActivityNote;
} {
  const note = findNote(notes, dateKey, team);
  if (note?.members?.length) {
    return { members: note.members, custom: true, note };
  }
  return { members: baseActivityMembers(team), custom: false, note };
}

export function soloAssignee(note?: ActivityNote | null): ActivityMember | null {
  if (note?.members?.length === 1) return note.members[0];
  return null;
}

export function assignedPeopleLabel(note?: ActivityNote | null) {
  if (!note?.members?.length) return "";
  if (note.members.length === 1) return note.members[0].name;
  return note.members.map((member) => shortFirstName(member.name)).join(", ");
}

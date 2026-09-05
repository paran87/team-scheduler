import { findNote, type ActivityMember, type ActivityNote } from "./activity-notes";
import { baseActivityMembers } from "./team-roster";
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

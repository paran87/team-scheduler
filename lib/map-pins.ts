import { findNote, notesForBlock, toDateKey, type ActivityNote } from "./activity-notes";
import { activityId } from "./calendar";
import { getPlaceCoords } from "./place-coords";
import { getVisibleBlocks } from "./schedule-merge";
import { TEAM_META } from "./schedule-data";
import { TEAM_ROSTERS } from "./team-roster";
import type { ScheduleBlock, TeamKey } from "./types";

export type MapPin = {
  id: string;
  team: TeamKey;
  place: string;
  lat: number;
  lng: number;
  leadName: string;
  leadPhoto: string;
  teamLabel: string;
  color: string;
  start: number;
  end: number;
  event?: string;
};

function coordsForBlock(
  block: ScheduleBlock,
  notes: ActivityNote[],
  year: number,
  monthIndex: number,
  place: string,
) {
  const known = getPlaceCoords(place);
  if (known) return known;

  for (let day = block.start; day <= block.end; day++) {
    const note = findNote(notes, toDateKey(year, monthIndex, day), block.team);
    if (note?.lat != null && note?.lng != null) return { lat: note.lat, lng: note.lng };
    const fromNotePlace = getPlaceCoords(note?.location);
    if (fromNotePlace) return fromNotePlace;
  }

  return undefined;
}

export function getMapPins(year: number, monthIndex: number, notes: ActivityNote[] = []): MapPin[] {
  const pins: MapPin[] = [];
  const seen = new Set<string>();

  for (const block of getVisibleBlocks(year, monthIndex, notes)) {
    if (block.team === "special") continue;
    const fields = notesForBlock(notes, year, monthIndex, block);
    const place = fields.location || block.place;
    if (!place) continue;
    const coords = coordsForBlock(block, notes, year, monthIndex, place);
    if (!coords) continue;
    const id = activityId(block);
    if (seen.has(id)) continue;
    seen.add(id);

    const roster = TEAM_ROSTERS[block.team];
    const meta = TEAM_META[block.team];

    pins.push({
      id,
      team: block.team,
      place,
      lat: coords.lat,
      lng: coords.lng,
      leadName: roster.lead.name,
      leadPhoto: roster.lead.photo || meta.avatar,
      teamLabel: meta.label,
      color: meta.color,
      start: block.start,
      end: block.end,
      event: block.event,
    });
  }

  return pins;
}

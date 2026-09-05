import { activityReportPath, findNote, teamLabel, toDateKey, type ActivityNote } from "./activity-notes";
import { durationLabelForAssignment } from "./assignment-duration";
import { membersForDate } from "./activity-composition";
import { getVisibleBlocks } from "./schedule-merge";
import { MONTH_NAMES } from "./schedule-data";
import { isTeamKey } from "./team-roster";
import type { ScheduleBlock, TeamKey } from "./types";

export type ReportFilter = "all" | "posted" | "missing";

export type TeamReportSummary = {
  team: TeamKey;
  fieldDays: number;
  deployments: number;
  locations: number;
  reportsPosted: number;
};

export type DeploymentReportRow = {
  key: string;
  start: number;
  end: number;
  team: TeamKey;
  location: string;
  duration: string;
  activity: string;
  reportHref: string;
  posted: boolean;
};

export type LocationReportRow = {
  location: string;
  teams: TeamKey[];
  coverage: string;
};

export type MonthlyReport = {
  fieldDays: number;
  deployments: number;
  locations: number;
  reportsPosted: number;
  uniquePersonnel: number;
  specialEvents: string[];
  teams: TeamReportSummary[];
  deploymentsList: DeploymentReportRow[];
  locationList: LocationReportRow[];
};

const TEAM_ORDER: TeamKey[] = ["usec", "b", "a"];

function isFieldBlock(block: ScheduleBlock): block is ScheduleBlock & { team: TeamKey } {
  return isTeamKey(block.team);
}

function firstLine(value?: string) {
  const text = (value ?? "").trim();
  if (!text) return "";
  return text.split("\n")[0].trim();
}

function noteHasMom(note?: ActivityNote) {
  return Boolean(note?.remarks?.trim() || note?.reportImages?.length);
}

function blockHasMom(block: ScheduleBlock, year: number, monthIndex: number, notes: ActivityNote[]) {
  for (let day = block.start; day <= block.end; day++) {
    if (noteHasMom(findNote(notes, toDateKey(year, monthIndex, day), block.team))) return true;
  }
  return false;
}

function formatDayRanges(days: number[], monthIndex: number) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (!sorted.length) return "—";
  const month = MONTH_NAMES[monthIndex].slice(0, 3);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  const flush = () => {
    ranges.push(start === prev ? `${month} ${start}` : `${month} ${start}–${prev}`);
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    flush();
    start = prev = sorted[i];
  }
  flush();
  return ranges.join(", ");
}

export function buildMonthlyReport(year: number, monthIndex: number, notes: ActivityNote[]): MonthlyReport {
  const blocks = getVisibleBlocks(year, monthIndex, notes);
  const field = blocks.filter(isFieldBlock);
  const specialEvents = blocks
    .filter((block) => block.team === "special")
    .map((block) => {
      const name = block.event || block.place || "Special event";
      return block.start === block.end ? `${name} · ${MONTH_NAMES[monthIndex].slice(0, 3)} ${block.start}` : `${name} · ${MONTH_NAMES[monthIndex].slice(0, 3)} ${block.start}–${block.end}`;
    });

  const fieldDays = new Set<number>();
  const locationMap = new Map<string, { teams: Set<TeamKey>; days: number[] }>();
  const people = new Set<string>();
  const teamDays = new Map<TeamKey, Set<number>>();
  const teamLocations = new Map<TeamKey, Set<string>>();
  const teamDeployments = new Map<TeamKey, number>();
  const teamReports = new Map<TeamKey, { posted: number; total: number }>();

  for (const team of TEAM_ORDER) {
    teamDays.set(team, new Set());
    teamLocations.set(team, new Set());
    teamDeployments.set(team, 0);
    teamReports.set(team, { posted: 0, total: 0 });
  }

  for (const block of field) {
    const location = (block.place || block.event || "Unspecified").trim() || "Unspecified";
    const posted = blockHasMom(block, year, monthIndex, notes);
    fieldDays.add(block.start);
    for (let day = block.start; day <= block.end; day++) {
      fieldDays.add(day);
      teamDays.get(block.team)?.add(day);
      const members = membersForDate(block.team, toDateKey(year, monthIndex, day), notes).members;
      for (const member of members) {
        const name = member.name.trim().toLowerCase();
        if (name) people.add(name);
      }
    }

    const loc = locationMap.get(location) ?? { teams: new Set<TeamKey>(), days: [] };
    loc.teams.add(block.team);
    for (let day = block.start; day <= block.end; day++) loc.days.push(day);
    locationMap.set(location, loc);

    teamLocations.get(block.team)?.add(location);
    teamDeployments.set(block.team, (teamDeployments.get(block.team) ?? 0) + 1);
    const reportCounts = teamReports.get(block.team) ?? { posted: 0, total: 0 };
    reportCounts.total += 1;
    if (posted) reportCounts.posted += 1;
    teamReports.set(block.team, reportCounts);
  }

  const deploymentsList: DeploymentReportRow[] = field
    .map((block) => {
      const location = (block.place || block.event || "—").trim() || "—";
      const dateKey = toDateKey(year, monthIndex, block.start);
      return {
        key: `${block.team}-${block.start}-${block.end}-${location}`,
        start: block.start,
        end: block.end,
        team: block.team,
        location,
        duration: durationLabelForAssignment(year, monthIndex, block.start, block.team, notes, block.start, block.end),
        activity: firstLine(block.activity) || firstLine(block.event) || "Scheduled deployment",
        reportHref: activityReportPath(dateKey, block.team),
        posted: blockHasMom(block, year, monthIndex, notes),
      };
    })
    .sort((a, b) => a.start - b.start || a.team.localeCompare(b.team));

  const reportsPosted = deploymentsList.filter((row) => row.posted).length;

  return {
    fieldDays: fieldDays.size,
    deployments: field.length,
    locations: locationMap.size,
    reportsPosted,
    uniquePersonnel: people.size,
    specialEvents,
    teams: TEAM_ORDER.map((team) => {
      const reports = teamReports.get(team) ?? { posted: 0, total: 0 };
      return {
        team,
        fieldDays: teamDays.get(team)?.size ?? 0,
        deployments: teamDeployments.get(team) ?? 0,
        locations: teamLocations.get(team)?.size ?? 0,
        reportsPosted: reports.posted,
      };
    }),
    deploymentsList,
    locationList: [...locationMap.entries()]
      .map(([location, value]) => ({
        location,
        teams: [...value.teams].sort((a, b) => a.localeCompare(b)),
        coverage: formatDayRanges(value.days, monthIndex),
      }))
      .sort((a, b) => a.location.localeCompare(b.location)),
  };
}

export function teamReportLabel(team: TeamKey) {
  return teamLabel(team);
}

export type TeamKey = "usec" | "b" | "a";
export type BlockTeam = TeamKey | "special";
export type TabName = "dashboard" | "calendar" | "activity" | "reports";
export type TeamFilter = TeamKey | "all";

export type AssignmentRow = {
  region: string;
  location: string;
  official: string;
};

export type TeamAssignmentGroup = {
  team: TeamKey;
  rows: AssignmentRow[];
};

export type ScheduleBlock = {
  team: BlockTeam;
  start: number;
  end: number;
  place?: string;
  event?: string;
  activity?: string;
  remarks?: string;
};

export type TeamMeta = {
  label: string;
  chip: string;
  chipSolid: string;
  photoClass: string;
  color: string;
  avatar: string;
  initials: string;
};

import type { ScheduleBlock, TeamKey, TeamMeta } from "./types";

export const scheduleBlocks: Record<string, ScheduleBlock[]> = {
  "2026-9": [
    { team: "usec", start: 2, end: 2, place: "Lingayen, San Jacinto" },
    { team: "b", start: 2, end: 2, place: "Lingayen, San Jacinto" },
    { team: "a", start: 2, end: 2, place: "Trece - Reloc" },

    { team: "usec", start: 3, end: 4, place: "Bataan" },
    { team: "b", start: 3, end: 5, place: "Pola, Mindoro" },

    { team: "usec", start: 8, end: 9, place: "Benguet" },

    { team: "usec", start: 10, end: 12, place: "Apayao" },
    { team: "b", start: 11, end: 11, place: "Sta. Cruz" },
    { team: "a", start: 11, end: 11, place: "Cavite" },

    { team: "usec", start: 13, end: 13, place: "Lucena", event: "With Asec Jojo" },
    { team: "usec", start: 14, end: 14, place: "San Narciso", event: "With Asec Jojo" },
    { team: "usec", start: 15, end: 16, place: "Bato, Catanduanes" },
    { team: "b", start: 14, end: 15, place: "Zamboanga" },

    { team: "usec", start: 17, end: 18, place: "Tagoloan, Mis. Or." },
    { team: "b", start: 17, end: 18, place: "Tagoloan, Mis. Or." },

    { team: "special", start: 20, end: 20, event: "Boogie Day" },

    { team: "usec", start: 21, end: 21, place: "Cabanatuan" },
    { team: "usec", start: 22, end: 22, place: "Botolan, Zambales" },
    { team: "b", start: 22, end: 22, place: "Santa Rosa, Biñan, San Pedro" },

    { team: "usec", start: 24, end: 25, place: "Ilocos Norte & Sur" },
    { team: "b", start: 24, end: 25, place: "Ilocos Norte & Sur" },

    { team: "special", start: 26, end: 26, event: "Farm" },
    { team: "special", start: 28, end: 28, event: "September Born" },
  ],
};

export const TEAM_META: Record<TeamKey, TeamMeta> = {
  usec: {
    label: "Team USEC",
    chip: "chip-usec",
    chipSolid: "chip-usec-solid",
    photoClass: "photo-usec",
    color: "var(--usec)",
    avatar: "/assets/team-usec.png",
    initials: "U",
  },
  b: {
    label: "Team B",
    chip: "chip-b",
    chipSolid: "chip-b-solid",
    photoClass: "photo-b",
    color: "var(--teamb)",
    avatar: "/assets/team-b.png",
    initials: "B",
  },
  a: {
    label: "Team A",
    chip: "chip-a",
    chipSolid: "chip-a-solid",
    photoClass: "photo-a",
    color: "var(--teama)",
    avatar: "/assets/team-a.png",
    initials: "A",
  },
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

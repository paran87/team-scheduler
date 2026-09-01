import type { AssignmentRow, TeamAssignmentGroup, TeamKey } from "./types";

export const TEAM_ASSIGNMENT_ORDER: TeamKey[] = ["a", "b", "usec"];

export const TEAM_ASSIGNMENTS: TeamAssignmentGroup[] = [
  {
    team: "a",
    rows: [
      { region: "IV-A", location: "Kawit", official: "Cong. Jolo Revilla" },
      { region: "IV-A", location: "Rosario", official: "Cong. Jolo Revilla" },
      { region: "IV-A", location: "Noveleta", official: "Cong. Jolo Revilla" },
      { region: "IV-A", location: "Bacoor", official: "Cong. Lani Mercado Revilla" },
      { region: "IV-A", location: "Trece", official: "ISF Reloc" },
      { region: "NCR", location: "Marikina", official: "Cong. Quimbo" },
      { region: "NCR", location: "All Cities", official: "" },
      { region: "VIII", location: "Calbiga, Samar", official: "Sec. Vince" },
      { region: "VIII", location: "Jipapad, ES", official: "Mayor Benjamin Ver" },
      { region: "VIII", location: "Ormoc", official: "Cong. Richard Gomez" },
    ],
  },
  {
    team: "b",
    rows: [
      { region: "IX", location: "Zamboanga", official: "Cong. Marlesa Hofer-Hasim" },
      { region: "IV-A", location: "All Except Cavite", official: "Cong. Dimaguila, Matibag, Gonzalez" },
      { region: "IV-B", location: "Pola, Mindoro", official: "Mayor" },
      { region: "VI", location: "All of Region VI", official: "Cong. Jamjam Baronda" },
      { region: "I", location: "All of Region I", official: "Mayors" },
      { region: "X", location: "Tagoloan, Mis. Or.", official: "Cong. Emano" },
      { region: "X", location: "Iligan, LDN", official: "Sec. Vince" },
      { region: "X", location: "CDO, Mis. Or.", official: "Sec. Vince" },
      { region: "X", location: "Bukidnon", official: "CMU" },
    ],
  },
  {
    team: "usec",
    rows: [
      { region: "II", location: "Cagayan", official: "Cong. Vargas, Mayor Ting" },
      { region: "CAR", location: "Benguet", official: "Sec. Vince" },
      { region: "CAR", location: "Baguio", official: "Sec. Vince" },
      { region: "CAR", location: "Apayao", official: "Cong. Bulot" },
      {
        region: "III",
        location: "All of Region III",
        official: "Cong. Anna York Bondoc, Albert Garcia, Gov. Garcia, Gov. Ebdane",
      },
      { region: "V", location: "Bato, Cat.", official: "Cong. Bong Teves" },
      { region: "V", location: "Naga, Cam. Sur", official: "Cong. Regacion, Mayor Leni" },
      { region: "V", location: "Milaor, Cam. Sur", official: "Cong. Regacion" },
      { region: "V", location: "Matnog, Sorsogon", official: "Mayor Robert Rodrigueza" },
      { region: "V", location: "Guinobatan, Albay", official: "Sec. Vince" },
      { region: "NIR", location: "Bacolod", official: "Cong. Albee Benitez" },
      { region: "VII", location: "Cebu City", official: "Sec. Vince" },
      { region: "VII", location: "Cebu Province", official: "Sec. Vince" },
      { region: "XI", location: "Davao City", official: "Sec. Vince" },
      { region: "XIII", location: "Butuan City", official: "Mayor" },
      { region: "XII", location: "Gensan", official: "Sec. Vince" },
      { region: "XII", location: "Sarangani", official: "Sec. Vince" },
      { region: "BARMM", location: "Maguindanao del Sur", official: "Cong. Toto Mangudadatu" },
      { region: "BARMM", location: "Maguindanao del Norte", official: "Cong. Toto Mangudadatu" },
      { region: "BARMM", location: "Cotabato City", official: "Cong. Toto Mangudadatu" },
    ],
  },
];

export function groupRowsByRegion(rows: AssignmentRow[]) {
  const groups: { region: string; rows: AssignmentRow[] }[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.region === row.region) {
      last.rows.push(row);
    } else {
      groups.push({ region: row.region, rows: [row] });
    }
  }

  return groups;
}

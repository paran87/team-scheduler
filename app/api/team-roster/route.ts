import { NextRequest } from "next/server";
import { addExtraRosterMember, readExtraRosterMembers, removeExtraRosterMember } from "@/lib/team-roster-store";
import { isTeamKey, setExtraRosterMembers } from "@/lib/team-roster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error("team-roster:", error);
  return Response.json({ error: message }, { status: 500, headers: NO_STORE });
}

export async function GET() {
  try {
    const members = await readExtraRosterMembers();
    return Response.json({ members }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not load team members.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const team = typeof formData.get("team") === "string" ? String(formData.get("team")).trim() : "";
    const name = typeof formData.get("name") === "string" ? String(formData.get("name")) : "";
    const title = typeof formData.get("title") === "string" ? String(formData.get("title")) : "";
    const file = formData.get("file");
    if (!isTeamKey(team)) {
      return Response.json({ error: "Choose a valid team." }, { status: 400, headers: NO_STORE });
    }
    const members = await addExtraRosterMember({
      team,
      name,
      title,
      file: file instanceof File ? file : null,
    });
    setExtraRosterMembers(members);
    return Response.json({ members }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add this team member.";
    const status = /already on this team's roster|Enter the member|4 MB|JPG, PNG/i.test(message) ? 400 : 500;
    if (status === 500) console.error("team-roster:", error);
    return Response.json({ error: message }, { status, headers: NO_STORE });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return Response.json({ error: "Missing member id." }, { status: 400, headers: NO_STORE });
    }
    const members = await removeExtraRosterMember(id);
    setExtraRosterMembers(members);
    return Response.json({ members }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not remove this team member.");
  }
}

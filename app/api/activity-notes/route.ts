import { NextRequest } from "next/server";
import { isBlockTeam, parseDateKey } from "@/lib/activity-notes";
import { deleteActivityNote, readActivityNotes, upsertActivityNote } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const notes = await readActivityNotes();
  return Response.json({ notes }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: string;
    id?: string;
    date?: string;
    team?: string;
    location?: string;
    activity?: string;
    remarks?: string;
  };

  if (body.action === "delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return Response.json({ error: "Missing note id." }, { status: 400, headers: NO_STORE });
    }
    const notes = await deleteActivityNote(id);
    return Response.json({ notes }, { headers: NO_STORE });
  }

  const date = typeof body.date === "string" ? body.date.trim() : "";
  const team = typeof body.team === "string" ? body.team.trim() : "";
  const location = typeof body.location === "string" ? body.location : "";
  const activity = typeof body.activity === "string" ? body.activity : "";
  const remarks = typeof body.remarks === "string" ? body.remarks : "";

  if (!parseDateKey(date) || !isBlockTeam(team)) {
    return Response.json({ error: "Enter a valid date and team." }, { status: 400, headers: NO_STORE });
  }

  const note = await upsertActivityNote({ date, team, location, activity, remarks });
  return Response.json({ note }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return Response.json({ error: "Missing note id." }, { status: 400, headers: NO_STORE });
  }
  const notes = await deleteActivityNote(id);
  return Response.json({ notes }, { headers: NO_STORE });
}

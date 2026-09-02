import { NextRequest } from "next/server";
import { isBlockTeam, parseDateKey } from "@/lib/activity-notes";
import { readActivityNotes, removeDashboardEntry, upsertActivityNote } from "@/lib/activity-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error("activity-notes:", error);
  return Response.json({ error: message }, { status: 500, headers: NO_STORE });
}

export async function GET() {
  try {
    const notes = await readActivityNotes();
    return Response.json({ notes }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not load saved activities.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      date?: string;
      team?: string;
      location?: string;
      activity?: string;
      remarks?: string;
      event?: string;
      hidden?: boolean;
    };

    if (body.action === "delete") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return Response.json({ error: "Missing note id." }, { status: 400, headers: NO_STORE });
      }
      const notes = await removeDashboardEntry(id);
      return Response.json({ notes }, { headers: NO_STORE });
    }

    const date = typeof body.date === "string" ? body.date.trim() : "";
    const team = typeof body.team === "string" ? body.team.trim() : "";
    const location = typeof body.location === "string" ? body.location : "";
    const activity = typeof body.activity === "string" ? body.activity : "";
    const remarks = typeof body.remarks === "string" ? body.remarks : "";
    const event = typeof body.event === "string" ? body.event : "";
    const hidden = body.hidden === true;

    if (!parseDateKey(date) || !isBlockTeam(team)) {
      return Response.json({ error: "Enter a valid date and team." }, { status: 400, headers: NO_STORE });
    }

    const note = await upsertActivityNote({ date, team, location, activity, remarks, event, hidden });
    return Response.json({ note }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not save or remove this activity.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return Response.json({ error: "Missing note id." }, { status: 400, headers: NO_STORE });
    }
    const notes = await removeDashboardEntry(id);
    return Response.json({ notes }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not remove this activity.");
  }
}

import { NextRequest } from "next/server";
import { isBlockTeam, noteId, parseDateKey, parseNoteId, scheduledEvent, scheduledLocation } from "@/lib/activity-notes";
import {
  MAX_REPORT_IMAGE_BYTES,
  MAX_REPORT_IMAGES,
  REPORT_IMAGE_TYPES,
  removeActivityReportImage,
  uploadActivityReportImage,
} from "@/lib/activity-report-storage";
import { readActivityNotes, resolveReportImages, upsertActivityNote } from "@/lib/activity-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error("activity-report-images:", error);
  return Response.json({ error: message }, { status: 500, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!parseNoteId(id)) {
      return Response.json({ error: "Missing activity id." }, { status: 400, headers: NO_STORE });
    }
    const images = await resolveReportImages(id);
    return Response.json({ images }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not load activity report photos.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const date = typeof formData.get("date") === "string" ? String(formData.get("date")).trim() : "";
    const team = typeof formData.get("team") === "string" ? String(formData.get("team")).trim() : "";
    const file = formData.get("file");

    if (!parseDateKey(date) || !isBlockTeam(team)) {
      return Response.json({ error: "Enter a valid date and team." }, { status: 400, headers: NO_STORE });
    }
    if (!(file instanceof File) || !file.size) {
      return Response.json({ error: "Choose a photo to upload." }, { status: 400, headers: NO_STORE });
    }
    if (file.size > MAX_REPORT_IMAGE_BYTES) {
      return Response.json({ error: "Each photo must be 4 MB or smaller." }, { status: 400, headers: NO_STORE });
    }
    if (file.type && !REPORT_IMAGE_TYPES.has(file.type)) {
      return Response.json({ error: "Upload a JPG, PNG, WEBP, or GIF photo." }, { status: 400, headers: NO_STORE });
    }

    const notes = await readActivityNotes();
    const existing = notes.find((note) => note.date === date && note.team === team);
    const currentImages = existing ? await resolveReportImages(existing.id) : [];
    if (currentImages.length >= MAX_REPORT_IMAGES) {
      return Response.json({ error: `You can attach up to ${MAX_REPORT_IMAGES} photos.` }, { status: 400, headers: NO_STORE });
    }

    const image = await uploadActivityReportImage(noteId(date, team), file);
    const note = await upsertActivityNote({
      date,
      team,
      location: existing?.location ?? scheduledLocation(date, team),
      activity: existing?.activity ?? "",
      remarks: existing?.remarks ?? "",
      event: existing?.event ?? scheduledEvent(date, team),
      hidden: existing?.hidden,
      members: existing?.members,
      reportImages: [...currentImages, image],
    });
    const allNotes = await readActivityNotes();
    return Response.json({ image, note, notes: allNotes }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not upload this photo.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    const imagePath = request.nextUrl.searchParams.get("path")?.trim() ?? "";
    const parsed = parseNoteId(id);
    if (!parsed || !imagePath) {
      return Response.json({ error: "Missing photo path." }, { status: 400, headers: NO_STORE });
    }
    if (!imagePath.startsWith(`${id}/`)) {
      return Response.json({ error: "Invalid photo path." }, { status: 400, headers: NO_STORE });
    }

    await removeActivityReportImage(imagePath);
    const existing = (await readActivityNotes()).find((note) => note.id === id);
    const remaining = (existing ? await resolveReportImages(id) : []).filter((image) => image.path !== imagePath);
    if (existing) {
      await upsertActivityNote({
        date: existing.date,
        team: existing.team,
        location: existing.location,
        activity: existing.activity,
        remarks: existing.remarks,
        event: existing.event,
        hidden: existing.hidden,
        members: existing.members,
        reportImages: remaining.length ? remaining : null,
      });
    }
    const notes = await readActivityNotes();
    return Response.json({ images: remaining, notes }, { headers: NO_STORE });
  } catch (error) {
    return fail(error, "Could not remove this photo.");
  }
}

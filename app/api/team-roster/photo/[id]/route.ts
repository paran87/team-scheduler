import { readLocalRosterPhoto } from "@/lib/team-roster-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PhotoParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: PhotoParams) {
  const { id } = await params;
  const photo = await readLocalRosterPhoto(id);
  if (!photo) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

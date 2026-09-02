import { getPlaceCoords } from "./place-coords";

export async function resolveCoords(location: string): Promise<{ lat: number; lng: number } | undefined> {
  const query = location.trim();
  if (!query) return undefined;

  const known = getPlaceCoords(query);
  if (known) return known;

  const search = async (params: Record<string, string>) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "team-scheduler/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return undefined;
    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = results[0];
    if (!first?.lat || !first?.lon) return undefined;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { lat, lng };
  };

  try {
    return (
      (await search({ q: `${query}, Philippines`, countrycodes: "ph" })) ??
      (await search({ q: query }))
    );
  } catch {
    return undefined;
  }
}

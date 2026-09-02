export const PLACE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Lingayen, San Jacinto": { lat: 16.0219, lng: 120.2319 },
  "Trece - Reloc": { lat: 14.2786, lng: 120.8669 },
  Bataan: { lat: 14.676, lng: 120.5361 },
  "Pola, Mindoro": { lat: 13.1436, lng: 121.4419 },
  Benguet: { lat: 16.455, lng: 120.589 },
  Apayao: { lat: 18.0072, lng: 121.1842 },
  "Sta. Cruz": { lat: 14.2814, lng: 121.4161 },
  Cavite: { lat: 14.4791, lng: 120.897 },
  Lucena: { lat: 13.9373, lng: 121.6173 },
  "San Narciso": { lat: 15.0142, lng: 120.0803 },
  "Bato, Catanduanes": { lat: 13.6081, lng: 124.2986 },
  Zamboanga: { lat: 6.9214, lng: 122.079 },
  "Tagoloan, Mis. Or.": { lat: 8.5389, lng: 124.7542 },
  Cabanatuan: { lat: 15.4858, lng: 120.9665 },
  "Botolan, Zambales": { lat: 15.2897, lng: 120.0244 },
  "Santa Rosa, Biñan, San Pedro": { lat: 14.3122, lng: 121.1114 },
  "Ilocos Norte & Sur": { lat: 17.5748, lng: 120.3869 },
};

export function getPlaceCoords(place?: string) {
  if (!place) return undefined;
  return PLACE_COORDS[place];
}

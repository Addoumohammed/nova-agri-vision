// Browser-safe static lookup of common trade ports / cities used in demo data.
// Keeps map component free of any SSR-unsafe imports.
export type LatLon = { lat: number; lon: number };

export const PORT_COORDS: Record<string, LatLon> = {
  "Alexandria, EG": { lat: 31.2001, lon: 29.9187 },
  "Rotterdam, NL": { lat: 51.9244, lon: 4.4777 },
  "Odesa, UA": { lat: 46.4825, lon: 30.7233 },
  "Hamburg, DE": { lat: 53.5511, lon: 9.9937 },
  "Casablanca, MA": { lat: 33.5731, lon: -7.5898 },
  "Jeddah, SA": { lat: 21.4858, lon: 39.1925 },
  "Mumbai, IN": { lat: 19.076, lon: 72.8777 },
  "Tokyo, JP": { lat: 35.6762, lon: 139.6503 },
  "Bogotá, CO": { lat: 4.711, lon: -74.0721 },
  "Dubai, AE": { lat: 25.2048, lon: 55.2708 },
  "Felixstowe, UK": { lat: 51.9639, lon: 1.3515 },
  "Nairobi, KE": { lat: -1.2921, lon: 36.8219 },
  "Shanghai, CN": { lat: 31.2304, lon: 121.4737 },
  "Los Angeles, US": { lat: 33.7405, lon: -118.2765 },
  "Santos, BR": { lat: -23.9608, lon: -46.3336 },
  "Colombo, LK": { lat: 6.9271, lon: 79.8612 },
  "Beirut, LB": { lat: 33.8938, lon: 35.5018 },
};

export function lookupCoords(name: string): LatLon | null {
  if (PORT_COORDS[name]) return PORT_COORDS[name];
  // Fallback: match by city prefix (before comma)
  const city = name.split(",")[0].trim().toLowerCase();
  for (const [k, v] of Object.entries(PORT_COORDS)) {
    if (k.toLowerCase().startsWith(city)) return v;
  }
  return null;
}

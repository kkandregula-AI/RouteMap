const VERCEL_BASE_URL = "https://route-map-two.vercel.app";

export async function geocodeSearch(q: string, country?: string) {
  const query = q.trim();
  if (query.length < 3) return [];

  let url = `${VERCEL_BASE_URL}/api/geocode?q=${encodeURIComponent(query)}`;
  if (country) url += `&country=${encodeURIComponent(country)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Geocode HTTP ${res.status}: ${t}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
// Vercel Serverless Function: /api/geocode?q=...
// Purpose: Proxy Nominatim search so your mobile app doesn't hit 403 blocks.

export default async function handler(req, res) {
  try {
    // Allow only GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = (req.query.q || "").toString().trim();
    if (q.length < 3) {
      return res.status(400).json({ error: "Query too short (min 3 chars)" });
    }

    // Keep results small for speed + policy friendliness
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;

    // IMPORTANT:
    // Use a real contact email (recommended by Nominatim usage policy).
    // Replace this with YOUR email.
    const NOMINATIM_USER_AGENT =
      "OSMRouteApp/1.0 (contact: your-email@example.com)";

    const r = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept": "application/json",
      },
    });

    // If Nominatim returns an error (403/429/etc.), forward it.
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = await r.json();

    // Cache at the edge briefly (helps prevent repeated calls)
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
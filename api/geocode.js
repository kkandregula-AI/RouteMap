export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = (req.query.q || "").toString().trim();
    if (q.length < 3) {
      return res.status(400).json({ error: "Query too short (min 3 chars)" });
    }

    // ✅ IMPORTANT: replace with YOUR real email + app identifier
    const CONTACT_EMAIL = "YOUR_REAL_EMAIL@example.com";
    const APP_ID = "route-map-two/1.0"; // any unique id is fine

    // ---------- Primary: Nominatim ----------
    const nominatimUrl =
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;

    const commonHeaders = {
      // Nominatim usage policy: identify your application (not generic UA)
      "User-Agent": `${APP_ID} (contact: ${CONTACT_EMAIL})`,
      // Often helps with CDNs / bot filters:
      "From": CONTACT_EMAIL,
      "Referer": "https://route-map-two.vercel.app/",
      "Accept": "application/json",
    };

    const r = await fetch(nominatimUrl, { headers: commonHeaders });

if (r.ok) {
  const data = await r.json();

  // ✅ Sort results to prefer India first
  const sorted = [...data].sort((a, b) => {
    const aIndia = (a.display_name || "").toLowerCase().includes("india");
    const bIndia = (b.display_name || "").toLowerCase().includes("india");
    return Number(bIndia) - Number(aIndia);
  });

  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  return res.status(200).json(sorted);
}

    // If Nominatim blocks (403/429), fall back to Photon (OSM-backed)
    if (r.status === 403 || r.status === 429) {
      const photonUrl =
        "https://photon.komoot.io/api/" +
        `?q=${encodeURIComponent(q)}&limit=6`;

      const pr = await fetch(photonUrl, { headers: { "Accept": "application/json" } });
      if (!pr.ok) {
        const txt = await pr.text();
        return res.status(pr.status).send(txt);
      }

      const pdata = await pr.json();

      // Convert Photon -> Nominatim-like array { place_id, display_name, lat, lon }
      const converted = (pdata?.features || []).map((f) => ({
        place_id: f?.properties?.osm_id ?? Math.random(),
        display_name: f?.properties?.name
          ? `${f.properties.name}${f.properties.city ? ", " + f.properties.city : ""}${f.properties.country ? ", " + f.properties.country : ""}`
          : (f?.properties?.label || "Result"),
        lat: String(f?.geometry?.coordinates?.[1]),
        lon: String(f?.geometry?.coordinates?.[0]),
      }));

      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
      return res.status(200).json(converted);
    }

    // Other errors: forward
    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
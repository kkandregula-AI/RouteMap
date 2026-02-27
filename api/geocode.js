export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = (req.query.q || "").toString().trim();
    if (q.length < 3) {
      return res.status(400).json({ error: "Query too short (min 3 chars)" });
    }

    // ✅ Put your real email here
    const CONTACT_EMAIL = "kkandregula@gmail.com";
    const APP_ID = "route-map-two/1.0";
    const REFERER = "https://route-map-two.vercel.app/";

    // If you want India-only results, uncomment countrycodes=in
    const nominatimUrl =
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      // + `&countrycodes=in`;

    const headers = {
      "User-Agent": `${APP_ID} (contact: ${CONTACT_EMAIL})`,
      "From": CONTACT_EMAIL,
      "Referer": REFERER,
      "Accept": "application/json",
    };

    const r = await fetch(nominatimUrl, { headers });

    // Read body safely (helps debugging when Nominatim returns HTML)
    const contentType = r.headers.get("content-type") || "";
    const text = await r.text();

    if (r.ok) {
      // Parse JSON only if it looks like JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Nominatim OK but non-JSON:", text.slice(0, 300));
        return res.status(502).json({ error: "Nominatim returned non-JSON response" });
      }

      // ✅ Guard: ensure array before sorting
      const arr = Array.isArray(data) ? data : [];

      // ✅ Prefer India first (global search, India priority)
      const sorted = arr.sort((a, b) => {
        const aIndia = String(a?.display_name || "").toLowerCase().includes("india");
        const bIndia = String(b?.display_name || "").toLowerCase().includes("india");
        return Number(bIndia) - Number(aIndia);
      });

      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
      return res.status(200).json(sorted);
    }

    // If Nominatim blocks/ratelimits, fall back to Photon
    if (r.status === 403 || r.status === 429) {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`;
      const pr = await fetch(photonUrl, { headers: { Accept: "application/json" } });

      const pText = await pr.text();
      if (!pr.ok) {
        console.error("Photon error:", pr.status, pText.slice(0, 300));
        return res.status(pr.status).send(pText);
      }

      let pdata;
      try {
        pdata = JSON.parse(pText);
      } catch {
        console.error("Photon non-JSON:", pText.slice(0, 300));
        return res.status(502).json({ error: "Photon returned non-JSON response" });
      }

      const converted = (pdata?.features || []).map((f) => ({
        place_id: f?.properties?.osm_id ?? Math.floor(Math.random() * 1e12),
        display_name:
          f?.properties?.label ||
          f?.properties?.name ||
          "Result",
        lat: String(f?.geometry?.coordinates?.[1] ?? ""),
        lon: String(f?.geometry?.coordinates?.[0] ?? ""),
      }));

      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
      return res.status(200).json(converted);
    }

    // Forward other errors (show short text for debugging)
    console.error("Nominatim error:", r.status, contentType, text.slice(0, 300));
    return res.status(r.status).send(text);
  } catch (e) {
    console.error("Function crash:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
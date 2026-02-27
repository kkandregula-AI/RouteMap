// Vercel Serverless Function
// URL: https://route-map-two.vercel.app/api/geocode?q=hyderabad

// Simple in-memory rate limiter (per deployment instance)
const rateLimit = new Map();

function checkLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 60; // 60 requests per minute

  const record = rateLimit.get(ip) || { count: 0, start: now };

  if (now - record.start > windowMs) {
    rateLimit.set(ip, { count: 1, start: now });
    return true;
  }

  if (record.count >= maxRequests) return false;

  record.count++;
  rateLimit.set(ip, record);
  return true;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = (req.query.q || "").toString().trim();
    if (q.length < 3) {
      return res.status(400).json({ error: "Query too short (min 3 chars)" });
    }

    const ip = req.headers["x-forwarded-for"] || "unknown";
    if (!checkLimit(ip)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    // 🔐 IMPORTANT: Put your real email here
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

    // ----------------------------
    // 1️⃣ Try Nominatim
    // ----------------------------
    try {
      const r = await fetch(nominatimUrl, { headers });
      const text = await r.text();

      if (r.ok) {
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          return res.status(502).json({ error: "Invalid JSON from Nominatim" });
        }

        const arr = Array.isArray(data) ? data : [];

        // Optional: Prefer India first
        arr.sort((a, b) => {
          const aIndia = String(a?.display_name || "").toLowerCase().includes("india");
          const bIndia = String(b?.display_name || "").toLowerCase().includes("india");
          return Number(bIndia) - Number(aIndia);
        });

        res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
        return res.status(200).json(arr);
      }
    } catch (err) {
      // Ignore and fallback
    }

    // ----------------------------
    // 2️⃣ Fallback: Photon (OSM-based)
    // ----------------------------
    try {
      const photonUrl =
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`;

      const pr = await fetch(photonUrl, {
        headers: { Accept: "application/json" },
      });

      const text = await pr.text();
      if (!pr.ok) {
        return res.status(pr.status).send(text);
      }

      let pdata;
      try {
        pdata = JSON.parse(text);
      } catch {
        return res.status(502).json({ error: "Invalid JSON from Photon" });
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

      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
      return res.status(200).json(converted);
    } catch (err) {
      return res.status(500).json({ error: "Photon fallback failed" });
    }
  } catch (err) {
    console.error("Function crash:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
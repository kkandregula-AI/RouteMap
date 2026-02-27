import { useState } from "react";

const VERCEL_BASE_URL = "https://route-map-two.vercel.app";

export function useGeocode() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string, country?: string) => {
    if (q.length < 3) return;

    setLoading(true);
    try {
      let url = `${VERCEL_BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`;
      if (country) url += `&country=${country}`;

      const res = await fetch(url);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
}
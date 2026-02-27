// hooks/useRoute.ts
import { useState } from "react";
import polyline from "@mapbox/polyline";

type LatLng = { latitude: number; longitude: number };

type DirectionStep = {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
};

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

export function useRoute() {
  const [coords, setCoords] = useState<LatLng[]>([]);
  const [directions, setDirections] = useState<DirectionStep[]>([]);
  const [meta, setMeta] = useState<{ distance: number; duration: number } | null>(null);

  const fetchRoute = async (points: LatLng[]) => {
    if (!points || points.length < 2) {
      throw new Error("Need at least start and destination");
    }

    const formatted = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
    const url = `${OSRM_URL}/${formatted}?overview=full&geometries=polyline&steps=true`;

    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Route HTTP ${res.status}: ${t}`);
    }

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("No route returned");

    // route line
    const decoded: LatLng[] = polyline.decode(route.geometry, 5).map(([lat, lon]) => ({
      latitude: lat,
      longitude: lon,
    }));
    setCoords(decoded);

    // meta
    setMeta({
      distance: Number(route.distance || 0),
      duration: Number(route.duration || 0),
    });

    // steps
    const steps: DirectionStep[] =
      route.legs?.flatMap((leg: any) =>
        (leg.steps || []).map((s: any) => ({
          instruction: s?.maneuver?.instruction || "Continue",
          distance: Number(s?.distance || 0),
          duration: Number(s?.duration || 0),
        }))
      ) || [];
    setDirections(steps);

    return { coords: decoded, meta: { distance: route.distance, duration: route.duration }, steps };
  };

  const clearRoute = () => {
    setCoords([]);
    setDirections([]);
    setMeta(null);
  };

  return { coords, directions, meta, fetchRoute, clearRoute };
}
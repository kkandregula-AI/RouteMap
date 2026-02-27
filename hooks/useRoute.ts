import { useState } from "react";
import polyline from "@mapbox/polyline";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

export function useRoute() {
  const [coords, setCoords] = useState<any[]>([]);
  const [directions, setDirections] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const fetchRoute = async (points: any[]) => {
    if (points.length < 2) return;

    const formatted = points
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");

    const res = await fetch(
      `${OSRM_URL}/${formatted}?overview=full&geometries=polyline&steps=true`
    );

    const data = await res.json();
    const route = data.routes[0];

    const decoded = polyline.decode(route.geometry, 5).map(([lat, lon]) => ({
      latitude: lat,
      longitude: lon,
    }));

    setCoords(decoded);

    setMeta({
      distance: route.distance,
      duration: route.duration,
    });

    const steps =
      route.legs?.flatMap((leg: any) =>
        leg.steps.map((s: any) => ({
          instruction: s.maneuver?.instruction,
          distance: s.distance,
        }))
      ) || [];

    setDirections(steps);
  };

  return { coords, directions, meta, fetchRoute };
}
// hooks/useNavigation.ts
import { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearestIndex(point: LatLng, route: LatLng[]) {
  let bestI = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(point, route[i]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return { index: bestI, distance: bestD };
}

function remainingDistanceFrom(route: LatLng[], fromIndex: number) {
  let sum = 0;
  for (let i = fromIndex; i < route.length - 1; i++) {
    sum += haversineMeters(route[i], route[i + 1]);
  }
  return sum;
}

export function useNavigation({
  routeCoords,
  routeDurationSec,
}: {
  routeCoords: LatLng[];
  routeDurationSec: number | null; // meta.duration from OSRM
}) {
  const [active, setActive] = useState(false);
  const [user, setUser] = useState<LatLng | null>(null);

  const [offRoute, setOffRoute] = useState(false);
  const [remainingMeters, setRemainingMeters] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);

  // Estimate average speed from OSRM duration (better than a constant)
  const avgSpeedMps = useMemo(() => {
    if (routeDurationSec && routeCoords.length > 1) {
      let dist = 0;
      for (let i = 0; i < routeCoords.length - 1; i++) {
        dist += haversineMeters(routeCoords[i], routeCoords[i + 1]);
      }
      return dist > 0 ? dist / routeDurationSec : 10;
    }
    return 10; // fallback ~36 km/h
  }, [routeCoords, routeDurationSec]);

  const start = async () => {
    if (!routeCoords || routeCoords.length < 2) {
      throw new Error("Create a route first (Show Route).");
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Location permission not granted.");

    setActive(true);

    const cur = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setUser({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });

    subRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // ~every 10m
      },
      (loc) => {
        setUser({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    );
  };

  const stop = () => {
    subRef.current?.remove();
    subRef.current = null;

    setActive(false);
    setOffRoute(false);
    setRemainingMeters(null);
    setRemainingSec(null);
  };

  useEffect(() => {
    if (!active || !user || routeCoords.length < 2) return;

    const { index, distance } = nearestIndex(user, routeCoords);

    // Simple off-route threshold
    const OFF_ROUTE_METERS = 60;
    setOffRoute(distance > OFF_ROUTE_METERS);

    const rem = remainingDistanceFrom(routeCoords, index);
    setRemainingMeters(rem);

    const sec = avgSpeedMps > 0 ? rem / avgSpeedMps : null;
    setRemainingSec(sec ? Math.max(0, Math.round(sec)) : null);
  }, [active, user, routeCoords, avgSpeedMps]);

  useEffect(() => {
    return () => subRef.current?.remove();
  }, []);

  return { active, user, offRoute, remainingMeters, remainingSec, start, stop };
}
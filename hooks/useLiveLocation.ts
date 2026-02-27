import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function useLiveLocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  const getNow = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setCoords(c);

    try {
      const rev = await Location.reverseGeocodeAsync(c);
      const code = rev?.[0]?.isoCountryCode?.toLowerCase() || null;
      setCountry(code);
    } catch {}

    return c;
  };

  useEffect(() => {
    // Get once on load (best-effort)
    getNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, country, getNow };
}
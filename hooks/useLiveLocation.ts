import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function useLiveLocation() {
  const [location, setLocation] = useState<any>(null);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    let sub: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const rev = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      setCountry(rev?.[0]?.isoCountryCode?.toLowerCase() || null);

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (update) => {
          setLocation(update.coords);
        }
      );
    })();

    return () => sub?.remove();
  }, []);

  return { location, country };
}
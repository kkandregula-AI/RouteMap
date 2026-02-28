// app/(tabs)/explore.tsx
import React from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View, Linking, Platform } from "react-native";
import { useRouteContext } from "../../context/RouteContext";

type LatLng = { latitude: number; longitude: number };
type Stop = { coord: LatLng; label?: string };

async function openDrivingDirections(origin: string, destination: string) {
  const googleUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  const appleUrl =
    `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(destination)}&dirflg=d`;

  const primary = Platform.OS === "ios" ? appleUrl : googleUrl;
  const fallback = Platform.OS === "ios" ? googleUrl : appleUrl;

  if (await Linking.canOpenURL(primary)) return Linking.openURL(primary);
  if (await Linking.canOpenURL(fallback)) return Linking.openURL(fallback);
  return Linking.openURL(googleUrl);
}

// Optional: Google Maps with waypoints (Android + any device with Google Maps)
// Note: waypoints support depends on platform/app; we gracefully fall back.
async function openDrivingDirectionsWithStops(start: LatLng, stops: Stop[], dest: LatLng) {
  const origin = `${start.latitude},${start.longitude}`;
  const destination = `${dest.latitude},${dest.longitude}`;

  const wp = (stops || [])
    .map((s) => `${s.coord.latitude},${s.coord.longitude}`)
    .join("|");

  const googleUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving` +
    (wp ? `&waypoints=${encodeURIComponent(wp)}` : "");

  try {
    if (await Linking.canOpenURL(googleUrl)) {
      await Linking.openURL(googleUrl);
      return true;
    }
  } catch {}
  return false;
}

export default function ExploreScreen() {
  const { route } = useRouteContext();

  const startNavigation = async () => {
    if (!route?.start || !route?.dest) {
      Alert.alert("No route yet", "Go to Home → choose Start & Destination → tap Show Route.");
      return;
    }

    try {
      // Prefer Google waypoints if we have stops (best effort)
      const hasStops = Array.isArray(route.stops) && route.stops.length > 0;

      if (hasStops) {
        const ok = await openDrivingDirectionsWithStops(route.start, route.stops as any, route.dest);
        if (ok) return;
      }

      const origin = `${route.start.latitude},${route.start.longitude}`;
      const destination = `${route.dest.latitude},${route.dest.longitude}`;
      await openDrivingDirections(origin, destination);
    } catch (e: any) {
      Alert.alert("Navigation error", String(e?.message || e));
    }
  };

  const startLine =
    route?.start
      ? `${route.startLabel || "Start"} (${route.start.latitude.toFixed(5)}, ${route.start.longitude.toFixed(5)})`
      : "—";

  const destLine =
    route?.dest
      ? `${route.destLabel || "Destination"} (${route.dest.latitude.toFixed(5)}, ${route.dest.longitude.toFixed(5)})`
      : "—";

  const stops: Stop[] = (route?.stops as any) || [];

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.sub}>Uses the current route from Home (instant sync).</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Route</Text>

        <Text style={styles.line}>
          <Text style={styles.bold}>Start:</Text> {startLine}
        </Text>

        <Text style={styles.line}>
          <Text style={styles.bold}>Destination:</Text> {destLine}
        </Text>

        <Text style={styles.line}>
          <Text style={styles.bold}>Stops:</Text> {stops.length}
        </Text>

        {stops.length > 0 && (
          <View style={styles.stopsWrap}>
            {stops.map((s, i) => (
              <Text key={i} style={styles.stopLine}>
                <Text style={styles.bold}>Stop {i + 1}:</Text>{" "}
                {s.label || "Stop"} ({s.coord.latitude.toFixed(5)}, {s.coord.longitude.toFixed(5)})
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.hint}>
          Tip: If you changed the route in Home, press “Show Route” again to update Explore instantly.
        </Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={startNavigation}>
        <Text style={styles.primaryBtnText}>Start Driving Directions</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "900" },
  sub: { marginTop: 6, opacity: 0.7 },

  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    backgroundColor: "#fff",
  },
  cardTitle: { fontWeight: "900", marginBottom: 10 },

  line: { marginBottom: 8, opacity: 0.9 },
  bold: { fontWeight: "900" },

  stopsWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  stopLine: { marginBottom: 6, opacity: 0.9 },

  hint: { marginTop: 10, opacity: 0.55, fontSize: 12 },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },
});
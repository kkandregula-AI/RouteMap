import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, Alert } from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import polyline from "@mapbox/polyline";

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

export default function App() {
  const [start, setStart] = useState(null); // { latitude, longitude }
  const [end, setEnd] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);

  const initialRegion = useMemo(
    () => ({
      latitude: 19.0760,     // Mumbai default
      longitude: 72.8777,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    []
  );

  const onLongPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    if (!start) {
      setStart({ latitude, longitude });
      setRouteCoords([]);
      return;
    }
    if (!end) {
      setEnd({ latitude, longitude });
      setRouteCoords([]);
      return;
    }

    // If both already exist, reset and set new start
    setStart({ latitude, longitude });
    setEnd(null);
    setRouteCoords([]);
  };

  const clearAll = () => {
    setStart(null);
    setEnd(null);
    setRouteCoords([]);
  };

  const fetchRoute = async () => {
    if (!start || !end) {
      Alert.alert("Pick 2 points", "Long-press once for Start and once for End.");
      return;
    }

    setLoading(true);
    try {
      // OSRM expects: lon,lat;lon,lat
      const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;

      // overview=full gives an encoded polyline in geometry (when geometries=polyline)
      const url =
        `${OSRM_ROUTE_URL}/${coords}` +
        `?overview=full&geometries=polyline&steps=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.routes?.length) throw new Error("No route returned");

      const route = data.routes[0];

      // Decode OSRM polyline (precision 5)
      const decoded = polyline.decode(route.geometry, 5).map(([lat, lon]) => ({
        latitude: lat,
        longitude: lon,
      }));

      setRouteCoords(decoded);
    } catch (err) {
      Alert.alert("Route error", String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>OSM Route Map</Text>
        <Text style={styles.sub}>
          Long-press: Start → End (long-press again resets)
        </Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion} onLongPress={onLongPress}>
          {/* OpenStreetMap tiles */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {start && (
            <Marker coordinate={start} title="Start" description="Long-press to set End" />
          )}
          {end && (
            <Marker coordinate={end} title="End" />
          )}

          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={5} />
          )}
        </MapView>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, (!start || !end || loading) && styles.btnDisabled]}
          onPress={fetchRoute}
          disabled={!start || !end || loading}
        >
          <Text style={styles.btnText}>{loading ? "Routing..." : "Get Route"}</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={clearAll}>
          <Text style={styles.btnText}>Clear</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { marginTop: 4, fontSize: 12, opacity: 0.7 },
  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },
  controls: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  btnSecondary: { backgroundColor: "#444" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700" },
});
 import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import debounce from "lodash.debounce";

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";
const VERCEL_BASE_URL = "https://route-map-two.vercel.app"; // your proxy

type LatLng = { latitude: number; longitude: number };
type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type DirectionStep = {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
};

export default function HomeScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [myLoc, setMyLoc] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [destLabel, setDestLabel] = useState<string>("");

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [directions, setDirections] = useState<DirectionStep[]>([]);
  const [routeMeta, setRouteMeta] = useState<{ distanceM: number; durationS: number } | null>(null);

  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  const initialRegion = useMemo(
    () => ({
      latitude: 19.076, // Mumbai default
      longitude: 72.8777,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    []
  );

  const formatKm = (m: number) => `${(m / 1000).toFixed(1)} km`;
  const formatMin = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

  const clearAll = () => {
    setDest(null);
    setDestLabel("");
    setRouteCoords([]);
    setDirections([]);
    setRouteMeta(null);
    setResults([]);
    setQuery("");
  };

  const getMyLocation = async (): Promise<LatLng | null> => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow location access to route from your position.");
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setMyLoc(coords);
      return coords;
    } catch (err: any) {
      Alert.alert("Location error", String(err?.message || err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (start: LatLng, end: LatLng) => {
    setLoading(true);
    try {
      // OSRM expects: lon,lat;lon,lat
      const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
      const url = `${OSRM_ROUTE_URL}/${coords}?overview=full&geometries=polyline&steps=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Route HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.routes?.length) throw new Error("No route returned");

      const route = data.routes[0];

      // Route line
      const geometry = route.geometry;
      const decoded: LatLng[] = polyline.decode(geometry, 5).map(([lat, lon]) => ({
        latitude: lat,
        longitude: lon,
      }));
      setRouteCoords(decoded);

      // Meta
      setRouteMeta({
        distanceM: Number(route.distance || 0),
        durationS: Number(route.duration || 0),
      });

      // Steps
      const steps: DirectionStep[] =
        route.legs?.flatMap((leg: any) =>
          (leg.steps || []).map((s: any) => ({
            instruction: s?.maneuver?.instruction || "Continue",
            distance: Number(s?.distance || 0),
            duration: Number(s?.duration || 0),
          }))
        ) || [];
      setDirections(steps);

      // Fit map to route
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(decoded, {
          edgePadding: { top: 80, right: 40, bottom: 320, left: 40 },
          animated: true,
        });
      }, 50);
    } catch (err: any) {
      Alert.alert("Route error", String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const routeFromMyLocation = async () => {
    if (!dest) {
      Alert.alert("Pick destination", "Search an address or long-press on the map.");
      return;
    }
    const start = myLoc || (await getMyLocation());
    if (!start) return;
    await fetchRoute(start, dest);
  };

  const onLongPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDest({ latitude, longitude });
    setDestLabel("Dropped pin");
    setRouteCoords([]);
    setDirections([]);
    setRouteMeta(null);
    setResults([]);
    setQuery("");
  };

  // ✅ Geocode search via Vercel proxy (debounced)
  const doSearch = async (text: string) => {
    const q = text.trim();

    if (q.length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const url = `${VERCEL_BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`;
      // console.log("GEOCODE URL =>", url);

      const res = await fetch(url);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t}`);
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setResults([]);
      Alert.alert("Search error", String(err?.message || err));
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(doSearch, 800), []);
  const onChangeQuery = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  const selectResult = (r: NominatimResult) => {
    const latitude = Number(r.lat);
    const longitude = Number(r.lon);
    const label = r.display_name;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert("Invalid result", "Could not read coordinates.");
      return;
    }

    setDest({ latitude, longitude });
    setDestLabel(label);
    setRouteCoords([]);
    setDirections([]);
    setRouteMeta(null);
    setResults([]);

    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      400
    );
  };

  const startNavigation = async () => {
    if (!dest) {
      Alert.alert("Pick destination", "Search an address or long-press on the map.");
      return;
    }

    const start = myLoc || (await getMyLocation());
    if (!start) return;

    const origin = `${start.latitude},${start.longitude}`;
    const destination = `${dest.latitude},${dest.longitude}`;

    const googleUrl =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    const appleUrl =
      `http://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
      `&daddr=${encodeURIComponent(destination)}&dirflg=d`;

    try {
      const primary = Platform.OS === "ios" ? appleUrl : googleUrl;
      const fallback = Platform.OS === "ios" ? googleUrl : appleUrl;

      if (await Linking.canOpenURL(primary)) {
        await Linking.openURL(primary);
        return;
      }
      if (await Linking.canOpenURL(fallback)) {
        await Linking.openURL(fallback);
        return;
      }
      await Linking.openURL(googleUrl);
    } catch (err: any) {
      Alert.alert("Navigation error", String(err?.message || err));
    }
  };

  // Optional: avoid react-native-maps crash on Expo Web
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Mobile only</Text>
        <Text style={{ marginTop: 8, opacity: 0.7, textAlign: "center" }}>
          This screen uses react-native-maps and runs on Android/iOS via Expo Go / builds.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>OSM Route + Directions</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Type destination (min 3 chars)…"
              placeholderTextColor="#777"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.searchHintRow}>
              {searching ? <ActivityIndicator /> : <View style={{ width: 20, height: 20 }} />}
              <Text style={styles.searchHint}>{searching ? "Searching…" : " "}</Text>
            </View>
          </View>
        </View>

        {results.length > 0 && (
          <View style={styles.results}>
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={results}
              keyExtractor={(item) => String(item.place_id)}
              renderItem={({ item }) => (
                <Pressable style={styles.resultItem} onPress={() => selectResult(item)}>
                  <Text numberOfLines={2} style={styles.resultText}>
                    {item.display_name}
                  </Text>
                </Pressable>
              )}
            />
            <Text style={styles.attribution}>Search: © OpenStreetMap contributors</Text>
          </View>
        )}
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={(r) => (mapRef.current = r)}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onLongPress={onLongPress}
        >
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

          {myLoc && <Marker coordinate={myLoc} title="My Location" />}
          {dest && <Marker coordinate={dest} title="Destination" description={destLabel || ""} />}

          {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} />}
        </MapView>

        {/* Floating: center to my location */}
        <Pressable
          style={[styles.fab, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={async () => {
            const loc = myLoc || (await getMyLocation());
            if (!loc) return;
            mapRef.current?.animateToRegion(
              { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 },
              350
            );
          }}
        >
          <Text style={styles.fabText}>📍</Text>
        </Pressable>
      </View>

      {/* Directions panel (under map, above buttons) */}
      {directions.length > 0 && (
        <View style={styles.directionsWrap}>
          <View style={styles.directionsHeader}>
            <Text style={styles.directionsTitle}>Directions</Text>
            {routeMeta && (
              <Text style={styles.directionsMeta}>
                {formatKm(routeMeta.distanceM)} • {formatMin(routeMeta.durationS)}
              </Text>
            )}
          </View>

          <FlatList
            data={directions}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <Text style={styles.directionItem}>
                {index + 1}. {item.instruction} • {formatKm(item.distance)}
              </Text>
            )}
          />
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={routeFromMyLocation}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Working…" : "Show Route"}</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnSecondary, loading && styles.btnDisabled]}
          onPress={startNavigation}
          disabled={loading}
        >
          <Text style={styles.btnText}>Start Navigation</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnTertiary]} onPress={clearAll} disabled={loading}>
          <Text style={styles.btnText}>Clear</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 8 },

  searchRow: { gap: 8 },
  searchBox: {
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontSize: 14, color: "#111" },
  searchHintRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  searchHint: { fontSize: 11, opacity: 0.6 },

  results: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    maxHeight: 220,
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  resultText: { fontSize: 13, color: "#111" },
  attribution: { fontSize: 11, opacity: 0.6, padding: 8 },

  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },

  fab: {
    position: "absolute",
    right: 14,
    bottom: 14,
    backgroundColor: "#111",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 18 },

  directionsWrap: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    maxHeight: 220,
  },
  directionsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  directionsTitle: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  directionsMeta: { fontSize: 12, opacity: 0.7 },
  directionItem: { fontSize: 13, marginBottom: 6, color: "#111" },

  controls: { flexDirection: "row", gap: 8, padding: 12, flexWrap: "wrap" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    minWidth: 110,
    flexGrow: 1,
  },
  btnSecondary: { backgroundColor: "#333" },
  btnTertiary: { backgroundColor: "#555" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "800" },
});
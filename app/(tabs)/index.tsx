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
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import debounce from "lodash.debounce";

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

type LatLng = { latitude: number; longitude: number };
type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function HomeScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [myLoc, setMyLoc] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [destLabel, setDestLabel] = useState<string>("");

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
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

  const clearAll = () => {
    setDest(null);
    setDestLabel("");
    setRouteCoords([]);
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
      const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
      const url = `${OSRM_ROUTE_URL}/${coords}?overview=full&geometries=polyline&steps=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.routes?.length) throw new Error("No route returned");

      const geometry = data.routes[0].geometry;
      const decoded = polyline.decode(geometry, 5).map(([lat, lon]) => ({
        latitude: lat,
        longitude: lon,
      }));

      setRouteCoords(decoded);

      // Fit map to route
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(decoded, {
          edgePadding: { top: 80, right: 40, bottom: 240, left: 40 },
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
    setResults([]);
    setQuery("");
  };

  // Nominatim search (debounced)
  const doSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      // IMPORTANT: Nominatim public usage policy requires identifying User-Agent/Referer
      // In mobile, Referer isn't practical; we set a descriptive User-Agent header.
      const url =
        `${NOMINATIM_SEARCH_URL}?format=json&addressdetails=1&limit=6` +
        `&q=${encodeURIComponent(q)}`;

      const res = await fetch(url, {
        headers: {
          // Customize this to your app name + contact
          "User-Agent": "OSMRouteApp/1.0 (contact: you@example.com)",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: NominatimResult[] = await res.json();
      setResults(data || []);
    } catch (err: any) {
      setResults([]);
      Alert.alert("Search error", String(err?.message || err));
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(doSearch, 600), []);
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
    setResults([]);

    // Move map to destination
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

    // Ensure we have a start point (current location)
    const start = myLoc || (await getMyLocation());
    if (!start) return;

    const origin = `${start.latitude},${start.longitude}`;
    const destination = `${dest.latitude},${dest.longitude}`;

    // Prefer Google Maps universal directions URL, then Apple Maps.
    // Google Maps URL format: api=1, origin, destination, travelmode. :contentReference[oaicite:0]{index=0}
    const googleUrl =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    // Apple Maps URL scheme (maps.apple.com) supports directions. :contentReference[oaicite:1]{index=1}
    const appleUrl =
      `http://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
      `&daddr=${encodeURIComponent(destination)}&dirflg=d`;

    try {
      // On iOS, Apple Maps is always available; on Android, Google Maps is typical.
      const primary = Platform.OS === "ios" ? appleUrl : googleUrl;
      const fallback = Platform.OS === "ios" ? googleUrl : appleUrl;

      const canOpenPrimary = await Linking.canOpenURL(primary);
      if (canOpenPrimary) {
        await Linking.openURL(primary);
        return;
      }

      const canOpenFallback = await Linking.canOpenURL(fallback);
      if (canOpenFallback) {
        await Linking.openURL(fallback);
        return;
      }

      // Last resort
      await Linking.openURL(googleUrl);
    } catch (err: any) {
      Alert.alert("Navigation error", String(err?.message || err));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>OSM Route + Navigation</Text>

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Type destination address (min 3 chars)…"
            placeholderTextColor="#777"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.searchHint}>{searching ? "Searching…" : " "}</Text>
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
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={routeFromMyLocation}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Working…" : "Show Route"}</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnNav, loading && styles.btnDisabled]}
          onPress={startNavigation}
          disabled={loading}
        >
          <Text style={styles.btnText}>Start Navigation</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={clearAll} disabled={loading}>
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

  searchBox: {
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontSize: 14, color: "#111" },
  searchHint: { fontSize: 11, opacity: 0.6, marginTop: 4 },

  results: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    maxHeight: 220,
  },
  resultItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f2f2f2" },
  resultText: { fontSize: 13, color: "#111" },
  attribution: { fontSize: 11, opacity: 0.6, padding: 8 },

  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },

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
  btnNav: { backgroundColor: "#0f4" as any }, // RN will ignore invalid on some; you can set any color you want
  btnSecondary: { backgroundColor: "#444" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "800" },
});
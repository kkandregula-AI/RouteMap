// app/(tabs)/index.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import debounce from "lodash.debounce";

import MapViewContainer from "../../components/MapViewContainer";
import SearchBox from "../../components/SearchBox";
import DirectionsPanel from "../../components/DirectionsPanel";
import ControlButtons from "../../components/ControlButtons";

import { useRoute } from "../../hooks/useRoute";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { geocodeSearch } from "../../hooks/useGeocode";

type LatLng = { latitude: number; longitude: number };

function toLatLng(r: any): LatLng | null {
  const lat = Number(r?.lat);
  const lon = Number(r?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon };
}

export default function HomeScreen() {
  const { country, getNow } = useLiveLocation();
  const { coords, directions, meta, fetchRoute, clearRoute } = useRoute();

  const [start, setStart] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [stops, setStops] = useState<LatLng[]>([]);

  const [startQuery, setStartQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");

  const [startResults, setStartResults] = useState<any[]>([]);
  const [destResults, setDestResults] = useState<any[]>([]);

  const debouncedStartSearch = useMemo(
    () =>
      debounce(async (text: string) => {
        const q = text.trim();
        if (q.length < 3) return setStartResults([]);
        try {
          const r = await geocodeSearch(q, country || undefined);
          setStartResults(r);
        } catch (e) {
          setStartResults([]);
        }
      }, 700),
    [country]
  );

  const debouncedDestSearch = useMemo(
    () =>
      debounce(async (text: string) => {
        const q = text.trim();
        if (q.length < 3) return setDestResults([]);
        try {
          const r = await geocodeSearch(q, country || undefined);
          setDestResults(r);
        } catch (e) {
          setDestResults([]);
        }
      }, 700),
    [country]
  );

  const onSelectStart = (r: any) => {
    const ll = toLatLng(r);
    if (!ll) return Alert.alert("Invalid start", "Could not read coordinates.");
    setStart(ll);
    setStartQuery(r.display_name || "Start");
    setStartResults([]);
    clearRoute();
  };

  const onSelectDest = (r: any) => {
    const ll = toLatLng(r);
    if (!ll) return Alert.alert("Invalid destination", "Could not read coordinates.");
    setDest(ll);
    setDestQuery(r.display_name || "Destination");
    setDestResults([]);
    clearRoute();
  };

  const useCurrentAsStart = async () => {
    const c = await getNow();
    if (!c) return Alert.alert("Location", "Location permission not granted.");
    setStart(c);
    setStartQuery("Current location");
    setStartResults([]);
    clearRoute();
  };

  const addStopFromDest = () => {
    if (!dest) {
      Alert.alert("Stop", "Select a place in Destination first, then add it as a stop.");
      return;
    }
    setStops((s) => [...s, dest]);
    setDest(null);
    setDestQuery("");
    setDestResults([]);
    clearRoute();
    Alert.alert("Stop added", "Now pick the final destination.");
  };

  const removeStop = (idx: number) => {
    setStops((s) => s.filter((_, i) => i !== idx));
    clearRoute();
  };

  const onRoute = async () => {
    if (!start) {
      Alert.alert("Missing", "Please choose Start (or use Current Location).");
      return;
    }
    if (!dest) {
      Alert.alert("Missing", "Please choose Destination.");
      return;
    }

    try {
      await fetchRoute([start, ...stops, dest]);
    } catch (e: any) {
      Alert.alert("Route error", String(e?.message || e));
    }
  };

  const onClear = () => {
    setStart(null);
    setDest(null);
    setStops([]);
    setStartQuery("");
    setDestQuery("");
    setStartResults([]);
    setDestResults([]);
    clearRoute();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>OSM Route Map</Text>
        <Text style={styles.sub}>Start → Stops → Destination</Text>

        <SearchBox
          placeholder="Start location"
          value={startQuery}
          onChangeText={(t: string) => {
            setStartQuery(t);
            debouncedStartSearch(t);
          }}
          results={startResults}
          onSelect={onSelectStart}
        />

        <Pressable style={styles.smallBtn} onPress={useCurrentAsStart}>
          <Text style={styles.smallBtnText}>Use Current Location as Start</Text>
        </Pressable>

        <SearchBox
          placeholder="Destination"
          value={destQuery}
          onChangeText={(t: string) => {
            setDestQuery(t);
            debouncedDestSearch(t);
          }}
          results={destResults}
          onSelect={onSelectDest}
        />

        <View style={styles.row}>
          <Pressable style={[styles.smallBtn, styles.smallBtnDark]} onPress={addStopFromDest}>
            <Text style={styles.smallBtnText}>Add as Stop</Text>
          </Pressable>
        </View>

        {stops.length > 0 && (
          <View style={styles.stopsBox}>
            <Text style={styles.stopsTitle}>Stops</Text>
            {stops.map((s, idx) => (
              <View key={idx} style={styles.stopRow}>
                <Text style={styles.stopText}>
                  {idx + 1}. {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                </Text>
                <Pressable onPress={() => removeStop(idx)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.mapWrap}>
        <MapViewContainer start={start} dest={dest} routeCoords={coords} />
      </View>

      <DirectionsPanel directions={directions} meta={meta} />

      <ControlButtons onRoute={onRoute} onClear={onClear} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 12, paddingTop: 10 },
  title: { fontSize: 20, fontWeight: "900" },
  sub: { marginTop: 4, opacity: 0.6, marginBottom: 10 },

  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },

  row: { flexDirection: "row", gap: 8, marginBottom: 10 },

  smallBtn: {
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  smallBtnDark: { backgroundColor: "#333" },
  smallBtnText: { color: "#fff", fontWeight: "800" },

  stopsBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  stopsTitle: { fontWeight: "900", marginBottom: 6 },
  stopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  stopText: { fontSize: 12, opacity: 0.8 },
  removeText: { color: "#c00", fontWeight: "800" },
});
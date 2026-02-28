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
import { useRouteContext } from "../../context/RouteContext";
import { useNavigation } from "../../hooks/useNavigation";

type LatLng = { latitude: number; longitude: number };
type Stop = { coord: LatLng; label?: string };

function toLatLng(r: any): LatLng | null {
  const lat = Number(r?.lat);
  const lon = Number(r?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon };
}

export default function HomeScreen() {
  const { country, getNow } = useLiveLocation();
  const { coords, directions, meta, fetchRoute, clearRoute } = useRoute();
  const { setRoute } = useRouteContext();

  const nav = useNavigation({
    routeCoords: coords,
    routeDurationSec: meta?.duration ?? null,
  });

  const [start, setStart] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);

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
        } catch {
          setStartResults([]);
        }
      }, 600),
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
        } catch {
          setDestResults([]);
        }
      }, 600),
    [country]
  );

  const onSelectStart = (r: any) => {
    const ll = toLatLng(r);
    if (!ll) return Alert.alert("Invalid start location");
    setStart(ll);
    setStartQuery(r.display_name || "Start");
    setStartResults([]);
    clearRoute();
    if (nav.active) nav.stop();
  };

  const onSelectDest = (r: any) => {
    const ll = toLatLng(r);
    if (!ll) return Alert.alert("Invalid destination");
    setDest(ll);
    setDestQuery(r.display_name || "Destination");
    setDestResults([]);
    clearRoute();
    if (nav.active) nav.stop();
  };

  const useCurrentAsStart = async () => {
    try {
      const c = await getNow();
      if (!c) return Alert.alert("Location permission required");
      setStart(c);
      setStartQuery("Current location");
      clearRoute();
      if (nav.active) nav.stop();
    } catch (e: any) {
      Alert.alert("Location error", String(e?.message || e));
    }
  };

  const addStopFromDest = () => {
    if (!dest) return Alert.alert("Select a destination first");
    setStops((prev) => [...prev, { coord: dest, label: destQuery }]);
    setDest(null);
    setDestQuery("");
    setDestResults([]);
    clearRoute();
    if (nav.active) nav.stop();
    Alert.alert("Stop added", "Now pick the final destination.");
  };

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
    clearRoute();
    if (nav.active) nav.stop();
  };

  const swapStartDest = () => {
    if (!start || !dest) return;

    const oldStart = start;
    const oldDest = dest;
    const oldStartQuery = startQuery;
    const oldDestQuery = destQuery;

    setStart(oldDest);
    setDest(oldStart);
    setStartQuery(oldDestQuery);
    setDestQuery(oldStartQuery);

    setStops([]);
    clearRoute();
    if (nav.active) nav.stop();
  };

  const onRoute = async () => {
    if (!start) return Alert.alert("Select Start location");
    if (!dest) return Alert.alert("Select Destination");

    try {
      await fetchRoute([start, ...stops.map((s) => s.coord), dest]);

      setRoute({
        start,
        dest,
        stops,
        startLabel: startQuery,
        destLabel: destQuery,
      });
    } catch (e: any) {
      Alert.alert("Route error", e?.message || "Something went wrong");
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
    if (nav.active) nav.stop();

    setRoute({
      start: null,
      dest: null,
      stops: [],
      startLabel: "",
      destLabel: "",
    });
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

        <View style={styles.row}>
          <Pressable style={styles.btnPrimary} onPress={useCurrentAsStart}>
            <Text style={styles.btnText}>Use Current Location</Text>
          </Pressable>

          <Pressable style={styles.btnDark} onPress={swapStartDest}>
            <Text style={styles.btnText}>Swap ↔</Text>
          </Pressable>
        </View>

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
          <Pressable style={styles.btnDark} onPress={addStopFromDest}>
            <Text style={styles.btnText}>Add Stop</Text>
          </Pressable>

          <Pressable
            style={styles.btnGrey}
            onPress={() => {
              setStops([]);
              clearRoute();
              if (nav.active) nav.stop();
            }}
          >
            <Text style={styles.btnText}>Clear Stops</Text>
          </Pressable>
        </View>

        {stops.length > 0 && (
          <View style={styles.stopsBox}>
            <Text style={styles.stopsTitle}>Stops</Text>
            {stops.map((s, i) => (
              <View key={i} style={styles.stopRow}>
                <Text style={styles.stopText}>
                  {i + 1}. {s.label || "Stop"} ({s.coord.latitude.toFixed(4)}, {s.coord.longitude.toFixed(4)})
                </Text>
                <Pressable onPress={() => removeStop(i)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ✅ Navigation banner */}
      {nav.active && (
        <View style={styles.navBanner}>
          <Text style={styles.navBannerTitle}>
            {nav.offRoute ? "Off route — go back to route" : "Navigation mode"}
          </Text>
          <Text style={styles.navBannerSub}>
            Remaining: {nav.remainingMeters ? (nav.remainingMeters / 1000).toFixed(1) : "—"} km • ETA:{" "}
            {nav.remainingSec ? Math.max(1, Math.round(nav.remainingSec / 60)) : "—"} min
          </Text>

          {/* ✅ Next instruction (simple MVP: first step) */}
          {directions?.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.turnTitle}>Next:</Text>
              <Text style={styles.turnText}>{directions[0].instruction}</Text>
            </View>
          )}

          {/* ✅ Manual reroute button when off-route */}
          {nav.offRoute && (
            <Pressable
              style={styles.rerouteBtn}
              onPress={async () => {
                try {
                  if (!dest) return Alert.alert("Destination missing");
                  if (!nav.user) return Alert.alert("No GPS yet");
                  await fetchRoute([nav.user, ...stops.map((s) => s.coord), dest]);
                } catch (e: any) {
                  Alert.alert("Re-route failed", String(e?.message || e));
                }
              }}
            >
              <Text style={styles.rerouteText}>Re-route</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapViewContainer
          start={start}
          dest={dest}
          routeCoords={coords}
          user={nav.user}
          followUser={nav.active}
        />
      </View>

      <DirectionsPanel directions={directions} meta={meta} />

      {/* ✅ Start/Stop in-app navigation */}
      <View style={styles.navRow}>
        {!nav.active ? (
          <Pressable
            style={[styles.btnNav, { backgroundColor: "#111" }]}
            onPress={async () => {
              if (!coords || coords.length < 2) {
                Alert.alert("Create route first", "Tap Show Route, then start navigation.");
                return;
              }
              try {
                await nav.start();
              } catch (e: any) {
                Alert.alert("Navigation", String(e?.message || e));
              }
            }}
          >
            <Text style={styles.btnNavText}>Start In-App Navigation</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.btnNav, { backgroundColor: "#333" }]} onPress={nav.stop}>
            <Text style={styles.btnNavText}>Stop Navigation</Text>
          </Pressable>
        )}
      </View>

      <ControlButtons onRoute={onRoute} onClear={onClear} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: { paddingHorizontal: 12, paddingTop: 10 },
  title: { fontSize: 20, fontWeight: "900" },
  sub: { marginBottom: 10, opacity: 0.6 },

  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },

  row: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },

  btnPrimary: { backgroundColor: "#111", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  btnDark: { backgroundColor: "#333", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  btnGrey: { backgroundColor: "#666", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "800" },

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
  stopText: { fontSize: 12, flex: 1, paddingRight: 10 },
  removeText: { color: "#c00", fontWeight: "800" },

  navBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  navBannerTitle: { fontWeight: "900", fontSize: 14 },
  navBannerSub: { marginTop: 4, opacity: 0.7 },

  turnTitle: { fontWeight: "900", marginBottom: 4 },
  turnText: { fontWeight: "700", opacity: 0.9 },

  rerouteBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
  },
  rerouteText: { color: "#fff", fontWeight: "900" },

  navRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  btnNav: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnNavText: { color: "#fff", fontWeight: "900" },
});
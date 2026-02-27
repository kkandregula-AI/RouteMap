import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";

import MapViewContainer from "../../components/MapViewContainer";
import SearchBox from "../../components/SearchBox";
import DirectionsPanel from "../../components/DirectionsPanel";
import ControlButtons from "../../components/ControlButtons";

import { useRoute } from "../../hooks/useRoute";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { geocodeSearch } from "../../hooks/useGeocode";

import debounce from "lodash.debounce";

export default function HomeScreen() {
  const { country } = useLiveLocation();
  const { coords, directions, meta, fetchRoute, clearRoute } = useRoute();

  const [start, setStart] = useState<any>(null);
  const [dest, setDest] = useState<any>(null);

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
        } catch {
          setDestResults([]);
        }
      }, 700),
    [country]
  );

  const onSelectStart = (r: any) => {
    setStart({ latitude: Number(r.lat), longitude: Number(r.lon) });
    setStartQuery(r.display_name);
    setStartResults([]);
    clearRoute();
  };

  const onSelectDest = (r: any) => {
    setDest({ latitude: Number(r.lat), longitude: Number(r.lon) });
    setDestQuery(r.display_name);
    setDestResults([]);
    clearRoute();
  };

  const onRoute = async () => {
    if (!start || !dest) {
      Alert.alert("Missing", "Please choose both Start and Destination.");
      return;
    }
    await fetchRoute([start, dest]);
  };

  const onClear = () => {
    setStart(null);
    setDest(null);
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
        <Text style={styles.sub}>Search Start and Destination</Text>

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
});
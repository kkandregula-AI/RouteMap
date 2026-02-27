import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

let MapView: any, Marker: any, Polyline: any, UrlTile: any;

// ✅ Only require react-native-maps on native (iOS/Android)
if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
  UrlTile = maps.UrlTile;
}

type LatLng = { latitude: number; longitude: number };

export default function MapViewContainer({
  start,
  dest,
  routeCoords,
}: {
  start: LatLng | null;
  dest: LatLng | null;
  routeCoords: LatLng[];
}) {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (routeCoords?.length > 0) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  }, [routeCoords]);

  // ✅ Web fallback (prevents crash / blank)
  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webTitle}>Map is mobile-only</Text>
        <Text style={styles.webText}>Open this app in Expo Go on iOS/Android.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={(r: any) => (mapRef.current = r)}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 19.076,
          longitude: 72.8777,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

        {start && <Marker coordinate={start} title="Start" />}
        {dest && <Marker coordinate={dest} title="Destination" />}

        {routeCoords?.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  webTitle: { fontSize: 18, fontWeight: "900" },
  webText: { marginTop: 8, opacity: 0.7, textAlign: "center" },
});
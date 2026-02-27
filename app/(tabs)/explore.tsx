import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { openDrivingDirections } from "../../utils/navigation";

type LatLng = { latitude: number; longitude: number };

export default function ExploreScreen() {
  const [route, setRoute] = useState<{
    start: LatLng | null;
    dest: LatLng | null;
    stops: LatLng[];
    savedAt: number;
  } | null>(null);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem("lastRoute");
    if (!raw) {
      setRoute(null);
      return;
    }
    try {
      setRoute(JSON.parse(raw));
    } catch {
      setRoute(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNavigation = async () => {
    if (!route?.start || !route?.dest) {
      Alert.alert("No route found", "Go to Home, pick start & destination, then press Show Route.");
      return;
    }

    const origin = `${route.start.latitude},${route.start.longitude}`;
    const destination = `${route.dest.latitude},${route.dest.longitude}`;

    try {
      await openDrivingDirections(origin, destination);
    } catch (e: any) {
      Alert.alert("Navigation error", String(e?.message || e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "900" }}>Explore</Text>
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        Uses the last route you created in Home.
      </Text>

      <Pressable
        onPress={load}
        style={{
          marginTop: 16,
          backgroundColor: "#333",
          padding: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Refresh Route</Text>
      </Pressable>

      <View style={{ marginTop: 16, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
        <Text style={{ fontWeight: "800" }}>Last Route</Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>
          {route?.start ? `Start: ${route.start.latitude.toFixed(5)}, ${route.start.longitude.toFixed(5)}` : "Start: —"}
        </Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>
          {route?.dest ? `Dest: ${route.dest.latitude.toFixed(5)}, ${route.dest.longitude.toFixed(5)}` : "Dest: —"}
        </Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>
          Stops: {route?.stops?.length || 0}
        </Text>
      </View>

      <Pressable
        onPress={startNavigation}
        style={{
          marginTop: 16,
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Start Driving Directions</Text>
      </Pressable>
    </SafeAreaView>
  );
}
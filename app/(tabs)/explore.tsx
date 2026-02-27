import React from "react";
import { Alert, Pressable, SafeAreaView, Text, View, Linking, Platform } from "react-native";
import { useLiveLocation } from "../../hooks/useLiveLocation";

export default function ExploreScreen() {
  const { coords, getNow } = useLiveLocation();

  const openNav = async () => {
    const start = coords || (await getNow());
    if (!start) return Alert.alert("Location", "Please allow location permission.");

    // Demo destination: you can later wire from shared state or storage
    const dest = { latitude: 17.385, longitude: 78.4867 }; // Hyderabad center

    const origin = `${start.latitude},${start.longitude}`;
    const destination = `${dest.latitude},${dest.longitude}`;

    const googleUrl =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    const appleUrl =
      `http://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
      `&daddr=${encodeURIComponent(destination)}&dirflg=d`;

    const primary = Platform.OS === "ios" ? appleUrl : googleUrl;
    await Linking.openURL(primary);
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "900" }}>Explore</Text>
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        This is now your Directions / Navigation screen.
      </Text>

      <Pressable
        onPress={openNav}
        style={{
          marginTop: 16,
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Start Driving Directions (Demo)</Text>
      </Pressable>
    </SafeAreaView>
  );
}
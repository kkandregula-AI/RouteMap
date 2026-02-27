import React from "react";
import { View, Pressable, Text } from "react-native";

export default function ControlButtons({
  onRoute,
  onClear,
}) {
  return (
    <View style={{ flexDirection: "row", padding: 12 }}>
      <Pressable
        onPress={onRoute}
        style={{ backgroundColor: "#111", padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff" }}>Show Route</Text>
      </Pressable>

      <Pressable
        onPress={onClear}
        style={{
          backgroundColor: "#555",
          padding: 12,
          borderRadius: 12,
          marginLeft: 8,
        }}
      >
        <Text style={{ color: "#fff" }}>Clear</Text>
      </Pressable>
    </View>
  );
}
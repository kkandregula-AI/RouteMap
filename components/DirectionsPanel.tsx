import React from "react";
import { View, Text, FlatList } from "react-native";
import { formatKm, formatMinutes } from "../utils/format";

export default function DirectionsPanel({ directions, meta }) {
  if (!directions.length) return null;

  return (
    <View style={{ maxHeight: 220, padding: 12 }}>
      {meta && (
        <Text style={{ fontWeight: "bold" }}>
          {formatKm(meta.distance)} • {formatMinutes(meta.duration)}
        </Text>
      )}

      <FlatList
        data={directions}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <Text>
            {index + 1}. {item.instruction} • {formatKm(item.distance)}
          </Text>
        )}
      />
    </View>
  );
}
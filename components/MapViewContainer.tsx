 import React, { useEffect, useRef } from "react";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { StyleSheet, View } from "react-native";

export default function MapViewContainer({ start, dest, routeCoords }) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (routeCoords?.length > 0) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  }, [routeCoords]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={(r) => (mapRef.current = r)}
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
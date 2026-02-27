import React from "react";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";

export default function MapViewContainer({
  start,
  dest,
  routeCoords,
}) {
  return (
    <MapView style={{ flex: 1 }}>
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />

      {start && <Marker coordinate={start} title="Start" />}
      {dest && <Marker coordinate={dest} title="Destination" />}
      {routeCoords.length > 0 && (
        <Polyline coordinates={routeCoords} strokeWidth={5} />
      )}
    </MapView>
  );
}
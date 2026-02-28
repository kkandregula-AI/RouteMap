// components/MapViewContainer.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

type LatLng = { latitude: number; longitude: number };

function toLeafletLatLng(p: LatLng) {
  return [p.latitude, p.longitude];
}

export default function MapViewContainer({
  start,
  dest,
  routeCoords,
  user,
  followUser,
}: {
  start: LatLng | null;
  dest: LatLng | null;
  routeCoords: LatLng[];
  user?: LatLng | null;
  followUser?: boolean;
}) {
  const webRef = useRef<WebView>(null);

  // Initial center
  const initialCenter: LatLng = user || start || dest || { latitude: 19.076, longitude: 72.8777 };

  // Build HTML once (we update data via postMessage)
  const html = useMemo(() => {
    const center = toLeafletLatLng(initialCenter);
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #fff; }
    .leaflet-control-attribution { font-size: 11px; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView(${JSON.stringify(center)}, 12);

    // OSM tiles (no key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Layers
    let startMarker = null;
    let destMarker = null;
    let userMarker = null;
    let routeLine = null;

    function setMarker(existing, latlng, label, color) {
      if (existing) map.removeLayer(existing);
      if (!latlng) return null;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="width:14px;height:14px;border-radius:999px;background:'+color+';border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>',
        iconSize: [14,14],
        iconAnchor: [7,7]
      });

      const m = L.marker(latlng, { icon }).addTo(map);
      if (label) m.bindPopup(label);
      return m;
    }

    function setRoute(coords) {
      if (routeLine) map.removeLayer(routeLine);
      if (!coords || coords.length < 2) { routeLine = null; return; }
      routeLine = L.polyline(coords, { weight: 5 }).addTo(map);
      try { map.fitBounds(routeLine.getBounds(), { padding: [30, 30] }); } catch(e){}
    }

    function follow(latlng) {
      if (!latlng) return;
      map.setView(latlng, Math.max(map.getZoom(), 16), { animate: true });
    }

    // Receive updates from React Native
    document.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'SET_DATA') {
          startMarker = setMarker(startMarker, msg.start, msg.startLabel || 'Start', '#111');
          destMarker  = setMarker(destMarker,  msg.dest,  msg.destLabel  || 'Destination', '#E11D48');
          userMarker  = setMarker(userMarker,  msg.user,  'You', '#2563EB');

          setRoute(msg.route);

          if (msg.followUser && msg.user) follow(msg.user);
          return;
        }

        if (msg.type === 'FOLLOW_USER') {
          if (msg.user) follow(msg.user);
          return;
        }
      } catch (e) {}
    });

    // iOS WebView compatibility
    window.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'SET_DATA') {
          startMarker = setMarker(startMarker, msg.start, msg.startLabel || 'Start', '#111');
          destMarker  = setMarker(destMarker,  msg.dest,  msg.destLabel  || 'Destination', '#E11D48');
          userMarker  = setMarker(userMarker,  msg.user,  'You', '#2563EB');

          setRoute(msg.route);

          if (msg.followUser && msg.user) follow(msg.user);
          return;
        }

        if (msg.type === 'FOLLOW_USER') {
          if (msg.user) follow(msg.user);
          return;
        }
      } catch (e) {}
    });
  </script>
</body>
</html>`;
  }, []);

  // Push fresh data into the map whenever state changes
  useEffect(() => {
    const payload = {
      type: "SET_DATA",
      start: start ? toLeafletLatLng(start) : null,
      dest: dest ? toLeafletLatLng(dest) : null,
      user: user ? toLeafletLatLng(user) : null,
      route: routeCoords?.length ? routeCoords.map(toLeafletLatLng) : [],
      followUser: !!followUser,
      startLabel: "Start",
      destLabel: "Destination",
    };

    webRef.current?.postMessage(JSON.stringify(payload));
  }, [start, dest, user, routeCoords, followUser]);

  // Web fallback (optional)
  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webTitle}>Map is mobile-only</Text>
        <Text style={styles.webText}>Open on Android/iOS for Leaflet map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        style={StyleSheet.absoluteFill}
        // Important: allow loading Leaflet CDN + OSM tiles
        mixedContentMode="always"
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  webTitle: { fontSize: 18, fontWeight: "900" },
  webText: { marginTop: 8, opacity: 0.7, textAlign: "center" },
});
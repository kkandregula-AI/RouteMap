import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import MapViewContainer from "../../components/MapViewContainer";
import SearchBox from "../../components/SearchBox";
import DirectionsPanel from "../../components/DirectionsPanel";
import ControlButtons from "../../components/ControlButtons";
import { useGeocode } from "../../hooks/useGeocode";
import { useRoute } from "../../hooks/useRoute";
import { useLiveLocation } from "../../hooks/useLiveLocation";

export default function HomeScreen() {
  const { location, country } = useLiveLocation();
  const { results, search } = useGeocode();
  const { coords, directions, meta, fetchRoute } = useRoute();

  const [start, setStart] = useState<any>(null);
  const [dest, setDest] = useState<any>(null);

  const handleRoute = () => {
    if (!start || !dest) return;
    fetchRoute([start, dest]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SearchBox
        placeholder="Start location"
        results={results}
        onSearch={(q) => search(q, country)}
        onSelect={(r) =>
          setStart({ latitude: Number(r.lat), longitude: Number(r.lon) })
        }
      />

      <SearchBox
        placeholder="Destination"
        results={results}
        onSearch={(q) => search(q, country)}
        onSelect={(r) =>
          setDest({ latitude: Number(r.lat), longitude: Number(r.lon) })
        }
      />

      <View style={{ flex: 1 }}>
        <MapViewContainer
          start={start}
          dest={dest}
          routeCoords={coords}
        />
      </View>

      <DirectionsPanel directions={directions} meta={meta} />

      <ControlButtons onRoute={handleRoute} onClear={() => {}} />
    </SafeAreaView>
  );
}
import React, { createContext, useContext, useState } from "react";

export type LatLng = { latitude: number; longitude: number };

export type Stop = {
  coord: LatLng;
  label?: string; // place name
};

export type RouteData = {
  start: LatLng | null;
  dest: LatLng | null;
  stops: Stop[];              // ✅ stops now include labels
  startLabel?: string;
  destLabel?: string;
};

type RouteContextType = {
  route: RouteData;
  setRoute: (r: RouteData) => void;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteData>({
    start: null,
    dest: null,
    stops: [],
    startLabel: "",
    destLabel: "",
  });

  return <RouteContext.Provider value={{ route, setRoute }}>{children}</RouteContext.Provider>;
}

export function useRouteContext() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("useRouteContext must be used inside <RouteProvider>");
  return ctx;
}
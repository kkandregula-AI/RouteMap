import React from "react";
import { Stack } from "expo-router";
import { RouteProvider } from "../context/RouteContext";

export default function RootLayout() {
  return (
    <RouteProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RouteProvider>
  );
}
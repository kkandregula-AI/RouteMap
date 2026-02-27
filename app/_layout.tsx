import { RouteProvider } from "../context/RouteContext";

export default function RootLayout() {
  return (
    <RouteProvider>
      {/* your existing layout code */}
    </RouteProvider>
  );
}
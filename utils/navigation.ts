import { Linking, Platform } from "react-native";

export async function openDrivingDirections(origin: string, destination: string) {
  const googleUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  // ✅ IMPORTANT: use HTTPS (not http)
  const appleUrl =
    `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(destination)}&dirflg=d`;

  const primary = Platform.OS === "ios" ? appleUrl : googleUrl;
  const fallback = Platform.OS === "ios" ? googleUrl : appleUrl;

  const canPrimary = await Linking.canOpenURL(primary);
  if (canPrimary) return Linking.openURL(primary);

  const canFallback = await Linking.canOpenURL(fallback);
  if (canFallback) return Linking.openURL(fallback);

  // Last resort
  return Linking.openURL(googleUrl);
}
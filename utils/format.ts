export const formatKm = (meters: number) =>
  `${(meters / 1000).toFixed(1)} km`;

export const formatMinutes = (seconds: number) =>
  `${Math.max(1, Math.round(seconds / 60))} min`;
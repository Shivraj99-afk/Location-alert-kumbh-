// Shared constants for the dynamic grid system
export const LAT_STEP = 0.00045; // ~50m
export const LNG_STEP = 0.0005;  // ~50m

export function getCellId(lat, lng) {
    const rLat = Math.floor(lat / LAT_STEP);
    const rLng = Math.floor(lng / LNG_STEP);
    return `${rLat},${rLng}`;
}

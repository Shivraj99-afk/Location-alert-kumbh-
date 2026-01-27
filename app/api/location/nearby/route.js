import { users, settings, reservations } from "../store";
import { NextResponse } from "next/server";
import { LAT_STEP, LNG_STEP, getCellId, getSafestPath } from "@/lib/grid";

/**
 * Calculates the Haversine distance between two points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));
  const autoRoute = searchParams.get("autoRoute") === "true";
  const targetLat = parseFloat(searchParams.get("targetLat"));
  const targetLng = parseFloat(searchParams.get("targetLng"));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Coordinates required" }, { status: 400 });
  }

  const now = Date.now();
  const myCell = getCellId(lat, lng);
  const crowdLimit = settings.crowdLimit || 5;

  // 1. Cleanup Stale Users and Aggregate Crowd Data
  const gridDensity = {};
  const nearbyUsers = [];

  for (const [id, u] of users.entries()) {
    // If user hasn't synced in 60 seconds, remove them
    if (now - u.time > 60000) {
      users.delete(id);
      continue;
    }

    const cellId = u.cellId || getCellId(u.lat, u.lng);
    gridDensity[cellId] = (gridDensity[cellId] || 0) + 1;

    // Track users within 500m
    if (id !== userId) {
      const dist = calculateDistance(lat, lng, u.lat, u.lng);
      if (dist < 500) {
        nearbyUsers.push({ id, lat: u.lat, lng: u.lng });
      }
    }
  }

  // 2. Identify My Rank in Current Sector
  const sectorUsers = Array.from(users.entries())
    .filter(([_, u]) => (u.cellId || getCellId(u.lat, u.lng)) === myCell)
    .sort((a, b) => (a[1].joinTime || 0) - (b[1].joinTime || 0));

  const myRank = sectorUsers.findIndex(([id]) => id === userId) + 1 || 1;
  const isCrowded = (gridDensity[myCell] || 0) >= crowdLimit;

  // 3. Generate Grid Snippet for Visualization (11x11 window)
  const gridCrowd = [];
  const myRLat = Math.floor(lat / LAT_STEP);
  const myRLng = Math.floor(lng / LNG_STEP);

  for (let dr = -5; dr <= 5; dr++) {
    for (let dc = -5; dc <= 5; dc++) {
      const r = myRLat + dr;
      const c = myRLng + dc;
      const cellId = `${r},${c}`;
      gridCrowd.push({
        id: cellId,
        lat: r * LAT_STEP,
        lng: c * LNG_STEP,
        count: gridDensity[cellId] || 0
      });
    }
  }

  // 4. Recommendation Logic (If sector is full or auto-routing is on)
  let recommendation = null;
  if (autoRoute || (isCrowded && myRank > crowdLimit)) {
    // Basic recommendation: closest safe cell with least crowd
    const safeCells = gridCrowd
      .filter(cell => cell.id !== myCell && cell.count < crowdLimit)
      .sort((a, b) => {
        // Distance heuristic + Crowd penalty
        const distA = Math.abs(myRLat - Math.floor(a.lat / LAT_STEP)) + Math.abs(myRLng - Math.floor(a.lng / LNG_STEP));
        const distB = Math.abs(myRLat - Math.floor(b.lat / LAT_STEP)) + Math.abs(myRLng - Math.floor(b.lng / LNG_STEP));
        return (distA + a.count * 2) - (distB + b.count * 2);
      });

    if (safeCells.length > 0) {
      recommendation = safeCells[0];
    }
  }

  // 5. Safest Path Calculation
  let safestPath = null;
  const target = (!isNaN(targetLat) && !isNaN(targetLng))
    ? { lat: targetLat, lng: targetLng }
    : (recommendation ? { lat: recommendation.lat + LAT_STEP / 2, lng: recommendation.lng + LNG_STEP / 2 } : null);

  if (target) {
    safestPath = getSafestPath({ lat, lng }, target, gridDensity, crowdLimit);
  }

  return NextResponse.json({
    nearby: nearbyUsers,
    myCell,
    myRank,
    gridCrowd,
    alert: isCrowded,
    recommendation,
    safestPath,
    crowdLimit
  });
}

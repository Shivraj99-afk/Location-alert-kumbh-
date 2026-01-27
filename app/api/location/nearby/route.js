import { users, settings, reservations } from "../store";
import { NextResponse } from "next/server";
import { LAT_STEP, LNG_STEP, getCellId, getSafestPath } from "@/lib/grid";

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));
  const autoRoute = searchParams.get("autoRoute") === "true";
  const targetLat = parseFloat(searchParams.get("targetLat"));
  const targetLng = parseFloat(searchParams.get("targetLng"));

  if (!userId || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const now = Date.now();
  const myCell = getCellId(lat, lng);
  const crowdLimit = settings.crowdLimit || 1; // "More than one person" means limit 1

  // 1. Cleanup & Stats
  const gridDensity = {};
  const nearbyUsers = [];

  // Clean old reservations
  for (const [key, time] of reservations.entries()) {
    if (now - time > 15000) reservations.delete(key);
  }

  for (const [id, u] of users.entries()) {
    if (now - u.time > 45000) {
      users.delete(id);
      continue;
    }
    const cellId = u.cellId || getCellId(u.lat, u.lng);
    gridDensity[cellId] = (gridDensity[cellId] || 0) + 1;

    if (id !== userId) {
      const dist = calculateDistance(lat, lng, u.lat, u.lng);
      if (dist < 300) nearbyUsers.push({ id, lat: u.lat, lng: u.lng });
    }
  }

  // 2. User Ranking & Identification
  const me = users.get(userId);
  const sectorUsers = Array.from(users.entries())
    .filter(([_, u]) => (u.cellId || getCellId(u.lat, u.lng)) === myCell)
    .sort((a, b) => (a[1].joinTime || 0) - (b[1].joinTime || 0));

  const myRank = sectorUsers.findIndex(([id]) => id === userId) + 1 || 1;
  const isCrowded = (gridDensity[myCell] || 0) > crowdLimit;

  // Alert logic: Only for "new" users (joined in last 20 seconds) or if they just became the "excess" arrival
  const isNewArrival = me && (now - me.joinTime < 20000);
  const shouldAlert = isCrowded && (myRank > crowdLimit) && isNewArrival;

  // 3. Dynamic Grid Snippet (Focused around user)
  const gridCrowd = [];
  const rBase = Math.floor(lat / LAT_STEP);
  const cBase = Math.floor(lng / LNG_STEP);

  for (let dr = -5; dr <= 5; dr++) {
    for (let dc = -5; dc <= 5; dc++) {
      const r = rBase + dr;
      const c = cBase + dc;
      const cellId = `${r},${c}`;
      gridCrowd.push({
        id: cellId,
        lat: r * LAT_STEP,
        lng: c * LNG_STEP,
        count: gridDensity[cellId] || 0
      });
    }
  }

  // 4. Load-Balanced Recommendations (To prevent safe-zone crowding)
  let recommendation = null;
  if (shouldAlert || autoRoute) {
    // Calculate "Projected Load" = Current Crowd + Active Reservations
    const getProjectedLoad = (cellId) => {
      const current = gridDensity[cellId] || 0;
      const reserved = Array.from(reservations.keys()).filter(k => k.endsWith(`:${cellId}`)).length;
      return current + reserved;
    };

    const candidates = gridCrowd
      .filter(c => c.id !== myCell && getProjectedLoad(c.id) < crowdLimit)
      .sort((a, b) => {
        const loadA = getProjectedLoad(a.id);
        const loadB = getProjectedLoad(b.id);
        if (loadA !== loadB) return loadA - loadB;
        // If loads are equal, pick by distance
        return Math.abs(rBase - Math.floor(a.lat / LAT_STEP)) - Math.abs(rBase - Math.floor(b.lat / LAT_STEP));
      });

    if (candidates.length > 0) {
      // Pick from top 2 to distribute even more
      const pickIdx = Math.min(candidates.length - 1, Math.floor(Math.random() * 2));
      recommendation = candidates[pickIdx];

      // Update Reservation
      for (const k of reservations.keys()) if (k.startsWith(userId)) reservations.delete(k);
      reservations.set(`${userId}:${recommendation.id}`, now);
    }
  }

  // 5. Final Pathfinding
  let safestPath = null;
  const target = (!isNaN(targetLat) && !isNaN(targetLng))
    ? { lat: targetLat, lng: targetLng }
    : (recommendation ? { lat: recommendation.lat + LAT_STEP / 2, lng: recommendation.lng + LNG_STEP / 2 } : null);

  if (target) {
    // Pass projection-aware density map to A* for better path selection
    const projectedMap = {};
    for (const cellId in gridDensity) projectedMap[cellId] = gridDensity[cellId];
    for (const key of reservations.keys()) {
      const cid = key.split(":")[1];
      projectedMap[cid] = (projectedMap[cid] || 0) + 1;
    }

    safestPath = getSafestPath({ lat, lng }, target, projectedMap, crowdLimit + 1);
  }

  return NextResponse.json({
    nearby: nearbyUsers,
    myCell,
    myRank,
    gridCrowd,
    alert: shouldAlert, // UI shows alert box only for new users
    isCrowded,          // For subtle UI indicators that don't pop up
    recommendation,
    safestPath,
    crowdLimit
  });
}

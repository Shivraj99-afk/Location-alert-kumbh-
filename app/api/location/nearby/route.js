import { users } from "../store";
import { NextResponse } from "next/server";

import { LAT_STEP, LNG_STEP, getCellId } from "@/lib/grid";

function distance(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// getCellId imported from @/lib/grid

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  const mePos = { lat, lng };
  const nearby = [];
  const gridCrowd = {};

  // Get current timestamp for cleanup
  const now = Date.now();

  for (const [id, u] of users) {
    // 1. Cleanup old users (> 30s)
    if (now - u.time > 30000) {
      users.delete(id);
      continue;
    }

    // 2. Bin into Global Grid
    const cellId = getCellId(u.lat, u.lng);
    gridCrowd[cellId] = (gridCrowd[cellId] || 0) + 1;

    // 3. Check for nearby markers (for visual map)
    if (id !== userId) {
      const d = distance(mePos, u);
      if (d <= 500) { // Return markers within 500m
        nearby.push({ id, lat: u.lat, lng: u.lng });
      }
    }
  }

  // 4. Determine Arrival Rank in the current cell
  const myCell = getCellId(lat, lng);
  const cellUsers = Array.from(users.entries())
    .filter(([_, u]) => getCellId(u.lat, u.lng) === myCell)
    .sort((a, b) => a[1].joinTime - b[1].joinTime);

  const myRank = cellUsers.findIndex(([id, _]) => id === userId) + 1;

  // 5. Generate a nearby grid snippet (5x5) for the client's easy rendering
  // This allows the client to see immediate neighbors even if the app is used anywhere
  const gridSnippet = [];
  const myRLat = Math.floor(lat / LAT_STEP);
  const myRLng = Math.floor(lng / LNG_STEP);

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = myRLat + dr;
      const c = myRLng + dc;
      const id = `${r},${c}`;
      gridSnippet.push({
        id,
        lat: r * LAT_STEP,
        lng: c * LNG_STEP,
        count: gridCrowd[id] || 0,
        isMe: id === myCell
      });
    }
  }

  return NextResponse.json({
    nearby,
    myRank: myRank || 1,
    myCell,
    gridCrowd: gridSnippet,
    alert: (gridCrowd[myCell] || 0) > 1 && myRank > 1
  });
}

import { users } from "../store";
import { NextResponse } from "next/server";
import { zones } from "@/app/location/zones/data";
import { isInside } from "@/app/location/geo";


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


export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));

  const me = { lat, lng };
  const nearby = [];

  // 1. Calculate Real-Time Crowd (Micro)
  const realTimeZoneCrowd = {};
  for (const z of zones) realTimeZoneCrowd[z.id] = 0;

  for (const [id, u] of users) {
    // Cleanup old users
    if (Date.now() - u.time > 20000) {
      users.delete(id);
      continue;
    }

    // Count in zones
    for (const z of zones) {
      if (isInside([u.lat, u.lng], z.polygon)) {
        realTimeZoneCrowd[z.id]++;
      }
    }

    // Skip myself for nearby list
    if (id === userId) continue;

    const d = distance(me, u);
    if (d <= 50) {
      nearby.push({ id, ...u });
    }
  }

  // 2. Simulate Satellite Data (Macro) - The "Strategic" View
  // We simulate much higher numbers because satellites see EVERYONE, not just app users.
  const satelliteCrowd = {};
  for (const z of zones) {
    // Base density + some fluctuation to look "live"
    // We force Zone B to be very crowded to demonstrate rerouting if the user is near it
    let base = 1200;
    if (z.id === "A") base = 4500; // Very crowded
    if (z.id === "B") base = 800;  // Moderate
    if (z.id === "C") base = 150;  // Open

    satelliteCrowd[z.id] = base + Math.floor(Math.random() * 50);
  }

  // 3. Determine User Rank (Arrival Order) in Current Zone
  let myRank = 1;
  const allUsers = Array.from(users.entries()).map(([id, u]) => ({ id, ...u }));
  const meData = allUsers.find(u => u.id === userId);

  if (meData && meData.currentZone) {
    const zoneResidents = allUsers
      .filter(u => u.currentZone === meData.currentZone)
      .sort((a, b) => a.joinTime - b.joinTime);

    myRank = zoneResidents.findIndex(u => u.id === userId) + 1;
  }

  return NextResponse.json({
    nearby,
    crowdAlert: nearby.length >= 3, // Alert if > 3 people are within 50m (Micro alert)
    zoneCrowd: realTimeZoneCrowd,   // App users only
    satelliteCrowd,                 // "Satellite" estimates
    myRank,                         // User's order in the zone
  });
}

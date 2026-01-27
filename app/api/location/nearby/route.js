import { users, settings, reservations } from "../store";
import { NextResponse } from "next/server";

import { LAT_STEP, LNG_STEP, getCellId, getSafestPath } from "@/lib/grid";

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
  const forceSafePath = searchParams.get("forceSafePath") === "true";
  const targetLat = parseFloat(searchParams.get("targetLat"));
  const targetLng = parseFloat(searchParams.get("targetLng"));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  const mePos = { lat, lng };
  const nearby = [];
  const gridCrowd = {};

  const now = Date.now();

  // Clear reservations older than 10 seconds periodically
  for (const [key, time] of reservations) {
    if (now - time > 10000) reservations.delete(key);
  }

  for (const [id, u] of users) {
    if (now - u.time > 30000) {
      users.delete(id);
      continue;
    }

    const cellId = getCellId(u.lat, u.lng);
    gridCrowd[cellId] = (gridCrowd[cellId] || 0) + 1;

    if (id !== userId) {
      const d = distance(mePos, u);
      if (d <= 500) {
        nearby.push({ id, lat: u.lat, lng: u.lng });
      }
    }
  }

  const myCell = getCellId(lat, lng);
  const cellUsers = Array.from(users.entries())
    .filter(([_, u]) => getCellId(u.lat, u.lng) === myCell)
    .sort((a, b) => a[1].joinTime - b[1].joinTime);

  const myRank = cellUsers.findIndex(([id, _]) => id === userId) + 1;

  const gridSnippet = [];
  const myRLat = Math.floor(lat / LAT_STEP);
  const myRLng = Math.floor(lng / LNG_STEP);

  for (let dr = -5; dr <= 5; dr++) {
    for (let dc = -5; dc <= 5; dc++) {
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

  // Determine Recommendation with Distribution
  let recommendation = null;
  const isCrowded = (gridCrowd[myCell] || 0) > settings.crowdLimit;

  if ((isCrowded && myRank > settings.crowdLimit) || forceSafePath) {
    // 1. STICKY LOGIC: Reuse existing reservation to avoid flickering
    const myKey = Array.from(reservations.keys()).find(k => k.startsWith(`${userId}:`));
    if (myKey) {
      const rid = myKey.split(":")[1];
      const rCell = gridSnippet.find(c => c.id === rid);
      if (rCell && rCell.count < settings.crowdLimit) {
        recommendation = rCell;
        reservations.set(myKey, now); // Refresh timestamp
      }
    }

    // 2. SEARCH LOGIC: If no sticky or sticky is now hazardous
    if (!recommendation) {
      const candidates = gridSnippet
        .filter(cell => cell.id !== myCell && cell.count < settings.crowdLimit)
        .sort((a, b) => {
          // Sort by load (current users + current reservations)
          const loadA = a.count + Array.from(reservations.keys()).filter(k => k.endsWith(a.id)).length;
          const loadB = b.count + Array.from(reservations.keys()).filter(k => k.endsWith(b.id)).length;
          return loadA - loadB;
        });

      if (candidates.length > 0) {
        recommendation = candidates[0];
        // Clear any old ones for this user
        for (const k of reservations.keys()) {
          if (k.startsWith(`${userId}:`)) reservations.delete(k);
        }
        reservations.set(`${userId}:${recommendation.id}`, now);
      }
    }
  } else {
    // Clear reservation if no longer needed
    for (const k of reservations.keys()) {
      if (k.startsWith(`${userId}:`)) reservations.delete(k);
    }
  }

  let safestPath = null;
  const target = (!isNaN(targetLat) && !isNaN(targetLng)) ? { lat: targetLat, lng: targetLng } : (recommendation ? { lat: recommendation.lat + LAT_STEP / 2, lng: recommendation.lng + LNG_STEP / 2 } : null);

  if (target) {
    const densityMap = {};
    gridSnippet.forEach(cell => densityMap[cell.id] = cell.count);
    safestPath = getSafestPath({ lat, lng }, target, densityMap, settings.crowdLimit);
  }

  return NextResponse.json({
    nearby,
    myRank: myRank || 1,
    myCell,
    gridCrowd: gridSnippet,
    alert: isCrowded && myRank > settings.crowdLimit,
    recommendation,
    safestPath,
    crowdLimit: settings.crowdLimit
  });
}

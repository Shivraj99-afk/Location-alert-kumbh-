import { users } from "../store";
import { NextResponse } from "next/server";
import { zones } from "@/app/location/zones/data";
import { isInside } from "@/app/location/geo";

export async function POST(req) {
  const { userId, lat, lng } = await req.json();

  const prev = users.get(userId);
  const currentZone = zones.find(z => isInside([lat, lng], z.polygon))?.id || null;

  // If the user is in a new zone, reset their joinTime
  let joinTime = prev?.joinTime || Date.now();
  if (prev && prev.currentZone !== currentZone) {
    joinTime = Date.now();
  } else if (!prev) {
    joinTime = Date.now();
  }

  users.set(userId, {
    lat,
    lng,
    time: Date.now(),
    joinTime,
    currentZone
  });

  return NextResponse.json({ ok: true });
}

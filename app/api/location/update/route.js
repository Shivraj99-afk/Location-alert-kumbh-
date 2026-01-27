import { users } from "../store";
import { NextResponse } from "next/server";
import { getCellId } from "@/lib/grid";

export async function POST(req) {
  const { userId, lat, lng } = await req.json();

  const prev = users.get(userId);
  const cellId = getCellId(lat, lng);

  // If the user is in a new cell, reset their joinTime
  let joinTime = prev?.joinTime || Date.now();
  if (prev && prev.cellId !== cellId) {
    joinTime = Date.now();
  } else if (!prev) {
    joinTime = Date.now();
  }

  users.set(userId, {
    ...prev,
    lat,
    lng,
    time: Date.now(),
    joinTime,
    cellId
  });

  return NextResponse.json({ ok: true });
}

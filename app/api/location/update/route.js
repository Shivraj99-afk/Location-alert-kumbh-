import { users } from "../store";
import { NextResponse } from "next/server";
import { getCellId } from "@/lib/grid";

export async function POST(req) {
  try {
    const { userId, lat, lng } = await req.json();

    if (!userId || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const cellId = getCellId(lat, lng);
    const existing = users.get(userId);

    // Initial join time or reset if cell changed
    let joinTime = existing?.joinTime || Date.now();
    if (existing && existing.cellId !== cellId) {
      joinTime = Date.now();
    }

    users.set(userId, {
      userId,
      lat,
      lng,
      cellId,
      joinTime,
      time: Date.now() // Last sync time
    });

    return NextResponse.json({ success: true, cellId });
  } catch (err) {
    console.error("Update Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

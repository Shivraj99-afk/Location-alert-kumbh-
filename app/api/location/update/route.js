import { users } from "../store";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { userId, lat, lng } = await req.json();

  users.set(userId, {
    lat,
    lng,
    time: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

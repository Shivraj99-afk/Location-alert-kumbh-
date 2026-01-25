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

const zoneCrowd = {};

for (const z of zones) zoneCrowd[z.id] = 0;

for (const u of users.values()) {
  for (const z of zones) {
    if (isInside([u.lat, u.lng], z.polygon)) {
      zoneCrowd[z.id]++;
    }
  }
}


export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));

  const me = { lat, lng };
  const nearby = [];

  for (const [id, u] of users) {
    if (id === userId) continue;

    if (Date.now() - u.time > 20000) {
      users.delete(id);
      continue;
    }

    const d = distance(me, u);

    if (d <= 50) {
      nearby.push({ id, ...u });
    }
  }

  return NextResponse.json({
    nearby,
    crowdAlert: nearby.length >= 1,
    zoneCrowd,
  });

}

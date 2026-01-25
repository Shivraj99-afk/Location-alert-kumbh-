"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";
import { zones } from "./zones/data";
import { isInside } from "./geo";


const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);

export default function LocationPage() {
  const [userId] = useState(uuid());
  const [pos, setPos] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [zoneCrowd, setZoneCrowd] = useState({});
  const [alert, setAlert] = useState(false);

  const myZone = pos ? zones.find(z =>
    isInside([pos.lat, pos.lng], z.polygon)
  ) : null;

  let safeZone = null;

  if (myZone) {
    let min = Infinity;

    for (const n of myZone.neighbors) {
      if (zoneCrowd[n] < min) {
        min = zoneCrowd[n];
        safeZone = n;
      }
    }
  }

  // ✅ fix leaflet icons CLIENT ONLY
  useEffect(() => {
    (async () => {
      const L = await import("leaflet");

      delete L.Icon.Default.prototype._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    })();
  }, []);

  // ask GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        }),
      () => alert("Location permission required"),
      { enableHighAccuracy: true }
    );
  }, []);

  // send + check nearby
  useEffect(() => {
    if (!pos) return;

    const id = setInterval(async () => {
      await fetch("/api/location/update", {
        method: "POST",
        body: JSON.stringify({
          userId,
          lat: pos.lat,
          lng: pos.lng,
        }),
      });

      const res = await fetch(
        `/api/location/nearby?userId=${userId}&lat=${pos.lat}&lng=${pos.lng}`
      );

      const data = await res.json();
      setNearby(data.nearby);
      setZoneCrowd(data.zoneCrowd);
      setAlert(data.crowdAlert);
    }, 5000);

    return () => clearInterval(id);
  }, [pos]);

  if (!pos) return <p>Detecting location...</p>;

  return (
    <div>
      {alert && (
        <div style={{ background: "red", color: "white", padding: 10 }}>
          Crowd detected within 50 meters
        </div>
      )}

      <MapContainer
        center={[pos.lat, pos.lng]}
        zoom={18}
        style={{ height: "90vh" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={[pos.lat, pos.lng]} />

        {nearby.map((u) => (
          <Marker key={u.id} position={[u.lat, u.lng]} />
        ))}

        {safeZone && (
          <div style={{ background: "#0a0", color: "white", padding: 10 }}>
            Recommended direction: Move towards Zone {safeZone}
          </div>
        )}


        <Circle center={[pos.lat, pos.lng]} radius={50} />
      </MapContainer>
    </div>
  );
}

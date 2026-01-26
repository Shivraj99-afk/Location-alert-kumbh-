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
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

export default function LocationPage() {
  const [userId] = useState(uuid());
  const [pos, setPos] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [zoneCrowd, setZoneCrowd] = useState({});
  const [myRank, setMyRank] = useState(1); // User's arrival order in current zone
  const [alert, setAlert] = useState(false);

  const myZone = pos ? zones.find(z =>
    isInside([pos.lat, pos.lng], z.polygon)
  ) : null;

  const recommendedZone = null;
  const targetCentroid = null;

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
      setZoneCrowd(data.zoneCrowd); // Micro (Real-time)
      setMyRank(data.myRank); // Arrival order
      setAlert(data.crowdAlert);
    }, 5000);

    return () => clearInterval(id);
  }, [pos]);


  if (!pos) return <p>Detecting location...</p>;

  return (
    <div style={{ position: "relative" }}>
      {/* Community Links */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000,
        display: "flex",
        gap: "10px"
      }}>
        <a href="/lost/feed" style={{
          background: "white",
          color: "#2563eb",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          textDecoration: "none"
        }}>
          📢 Lost & Found
        </a>
        <a href="/volunteer" style={{
          background: "white",
          color: "#059669",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          textDecoration: "none"
        }}>
          🤝 Volunteer
        </a>
        <a href="/sector-map" style={{
          background: "white",
          color: "#d97706",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          textDecoration: "none"
        }}>
          🗺️ Sector Map
        </a>
        <a href="/live-crowd" style={{
          background: "white",
          color: "#dc2626",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          textDecoration: "none"
        }}>
          🔴 Live Grid
        </a>
      </div >

      {/* System Status */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1000,
        background: "rgba(0,0,0,0.8)",
        color: "#00ff00",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "12px",
        fontFamily: "monospace"
      }}>
        📱 MICRO SENSORS: LIVE <br />
        🔢 ENTRY ORDER: {myRank}
      </div>

      {alert && (
        <div style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "rgba(255, 0, 0, 0.9)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: "bold",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          ⚠️ MICRO-LEVEL ALERT: Crowd detected within 50 meters
        </div>
      )}


      <MapContainer
        center={[pos.lat, pos.lng]}
        zoom={18}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {zones.map((z) => (
          <Polygon
            key={z.id}
            positions={z.polygon}
            pathOptions={{
              color: z.id === myZone?.id ? "#ff4444" : "#33b5e5",
              fillOpacity: 0.3,
              weight: 2
            }}
          >
            <Tooltip permanent direction="center" className="zone-tooltip" opacity={0.9}>
              <div style={{ textAlign: 'center' }}>
                <b>{z.name}</b><br />
                <span style={{ fontSize: '10px' }}>📱 App: {zoneCrowd[z.id] || 0}</span>
              </div>
            </Tooltip>
          </Polygon>
        ))}

        <Marker position={[pos.lat, pos.lng]} />

        {nearby.map((u) => (
          <Marker key={u.id} position={[u.lat, u.lng]} />
        ))}


        <Circle center={[pos.lat, pos.lng]} radius={50} pathOptions={{ color: alert ? "red" : "blue" }} />
      </MapContainer>
    </div >
  );
}

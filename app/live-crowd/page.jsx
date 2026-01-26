"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";

// Dynamic imports for Leaflet components
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

export default function LiveCrowdPage() {
    const [userId] = useState(uuid());
    const [pos, setPos] = useState(null);
    const [alert, setAlert] = useState(false);

    // Fix Leaflet icons on the client
    useEffect(() => {
        (async () => {
            const L = await import("leaflet");
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
        })();
    }, []);

    // Request location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (p) => {
                setPos({
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                });
            },
            () => alert("Location permission is required for crowd monitoring.")
        );
    }, []);

    // Update and Poll
    useEffect(() => {
        if (!pos) return;

        const id = setInterval(async () => {
            try {
                await fetch("/api/location/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId,
                        lat: pos.lat,
                        lng: pos.lng,
                    }),
                });

                const res = await fetch(
                    `/api/location/nearby?lat=${pos.lat}&lng=${pos.lng}&userId=${userId}`
                );

                const data = await res.json();
                setAlert(data.crowdAlert);
            } catch (err) {
                console.error("Failed to sync live crowd data:", err);
            }
        }, 5000);

        return () => clearInterval(id);
    }, [pos, userId]);

    if (!pos) return <div className="h-screen flex items-center justify-center font-bold">Requesting location access...</div>;

    return (
        <div className="relative">
            {alert && (
                <div className="absolute top-0 left-0 right-0 z-[1000] bg-red-600 text-white p-4 text-center font-bold shadow-lg animate-pulse">
                    ⚠️ HIGH DENSITY DETECTED WITHIN 50 METERS
                </div>
            )}

            <MapContainer
                center={[pos.lat, pos.lng]}
                zoom={18}
                style={{ height: "90vh", width: "100%" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[pos.lat, pos.lng]} />
                <Circle
                    center={[pos.lat, pos.lng]}
                    radius={50}
                    pathOptions={{
                        color: alert ? 'red' : '#3b82f6',
                        fillColor: alert ? 'red' : '#3b82f6'
                    }}
                />
            </MapContainer>

            <div className="p-4 bg-white flex justify-between items-center border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${alert ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <span className="text-sm font-semibold">{alert ? 'Status: Danger' : 'Status: Safe'}</span>
                </div>
                <a href="/sector-map" className="text-blue-600 font-bold text-sm underline">
                    Open Sector Reporting →
                </a>
            </div>
        </div>
    );
}

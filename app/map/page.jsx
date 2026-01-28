"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useState } from "react";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

const targetLocation = [20.009171010117733, 73.79168987274171];

export default function SimpleLocationPage() {
    // Fix leaflet icons
    useState(() => {
        if (typeof window !== 'undefined') {
            import("leaflet").then(L => {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                });
            });
        }
    });

    return (
        <div className="relative w-full h-screen bg-gray-900">
            {/* Minimal Header */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-md px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                <h1 className="text-white font-black text-xs uppercase tracking-[0.3em]">Location Point</h1>
            </div>

            <MapContainer
                center={targetLocation}
                zoom={18}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

            </MapContainer>

            {/* Float Action: Back */}
            <a
                href="/sector-map"
                className="absolute bottom-8 right-8 z-[1000] bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform border border-gray-100"
            >
                ← Back to Sector Map
            </a>

            <style jsx global>{`
                .leaflet-container { background: #111 !important; }
            `}</style>
        </div>
    );
}

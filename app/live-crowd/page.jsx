"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

export default function LiveCrowdPage() {
    const [userId] = useState(() => `u-${uuid().slice(0, 16)}`);
    const [pos, setPos] = useState(null);
    const [peers, setPeers] = useState({});
    const [isGpsActive, setIsGpsActive] = useState(false);

    const channelRef = useRef(null);

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

    // WebSocket Persistence (Swarm)
    useEffect(() => {
        const channel = supabase.channel('crowd-swarm', {
            config: { presence: { key: userId } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const formattedPeers = {};
                Object.keys(state).forEach(key => {
                    if (key !== userId) {
                        formattedPeers[key] = state[key][state[key].length - 1];
                    }
                });
                setPeers(formattedPeers);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    channelRef.current = channel;
                }
            });

        return () => channel.unsubscribe();
    }, [userId]);

    // Real GPS Tracking & Broadcast (No Polling)
    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        const watchId = navigator.geolocation.watchPosition(
            (p) => {
                const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };
                setPos(newPos);
                setIsGpsActive(true);

                if (channelRef.current) {
                    channelRef.current.track({
                        lat: p.coords.latitude,
                        lng: p.coords.longitude,
                        userId: userId
                    });
                }
            },
            () => setIsGpsActive(false),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [userId]);

    // Calculate High Density Alert (Client-side)
    const alert = useMemo(() => {
        if (!pos) return false;
        // Count peers within 50m
        const nearbyPeers = Object.values(peers).filter(peer => {
            const dist = getDistance(pos.lat, pos.lng, peer.lat, peer.lng);
            return dist < 50;
        });
        return nearbyPeers.length >= 2; // Alert if 2+ other people are within 50m
    }, [pos, peers]);

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    if (!pos) return (
        <div className="h-screen flex items-center justify-center bg-black text-blue-400 font-mono text-xs uppercase tracking-widest">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                Initializing WebSocket Swarm...
            </div>
        </div>
    );

    return (
        <div className="relative h-screen bg-black overflow-hidden font-sans">
            {/* Dark Premium HUD */}
            <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl ${alert ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
                        }`}>
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        {alert ? '⚠️ DANGER: HIGH DENSITY' : '✅ AREA STATUS: CLEAR'}
                    </div>
                    <div className="bg-black/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white shadow-3xl pointer-events-auto">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Live Swarm</p>
                        <p className="font-black text-xl">👥 {Object.keys(peers).length + 1}</p>
                    </div>
                </div>
            </div>

            <MapContainer
                center={[pos.lat, pos.lng]}
                zoom={18}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />

                {/* YOUR POSITION */}
                <Circle
                    center={[pos.lat, pos.lng]}
                    radius={5}
                    pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
                >
                    <Tooltip permanent direction="top" className="swarm-label">
                        <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">YOU</div>
                    </Tooltip>
                </Circle>

                <Circle
                    center={[pos.lat, pos.lng]}
                    radius={50}
                    pathOptions={{
                        color: alert ? 'red' : '#3d4451',
                        fillColor: alert ? 'red' : 'transparent',
                        fillOpacity: alert ? 0.2 : 0,
                        dashArray: '10, 10'
                    }}
                />

                {/* PEERS (WebSockets) */}
                {Object.values(peers).map((peer, idx) => (
                    <Circle
                        key={peer.userId || idx}
                        center={[peer.lat, peer.lng]}
                        radius={3}
                        pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 1 }}
                    />
                ))}
            </MapContainer>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-3xl flex justify-between items-center text-white">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-tighter">Global Monitoring</span>
                        <span className="text-sm font-black">WS Real-time Precision</span>
                    </div>
                    <a href="/sector-map" className="bg-blue-600 hover:bg-blue-700 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 no-underline text-white">
                        Report Sector
                    </a>
                </div>
            </div>

            <style jsx global>{`
                .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
                .swarm-label { background: transparent !important; border: none !important; box-shadow: none !important; }
            `}</style>
        </div>
    );
}

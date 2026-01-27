"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

// DEMO CONFIG
const LEADER_START = { lat: 19.9975, lng: 73.7898 };
const MEMBER_START = { lat: 19.9978, lng: 73.7901 };
const MEMBER_DRIFT_END = { lat: 19.9995, lng: 73.7920 }; // Far away position
const DRIFT_TRIGGER_TIME = 5000; // 5 seconds

export default function FamilyTracker() {
    const [joined, setJoined] = useState(false);
    const [role, setRole] = useState(null); // 'leader' or 'member'
    const [groupCode, setGroupCode] = useState("");

    // Demo positions
    const [leaderPos, setLeaderPos] = useState(LEADER_START);
    const [memberPos, setMemberPos] = useState(MEMBER_START);
    const [isDrifting, setIsDrifting] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const driftIntervalRef = useRef(null);

    // Fix Leaflet icons
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

    // Start demo drift after 5 seconds
    useEffect(() => {
        if (!joined) return;

        const driftTimer = setTimeout(() => {
            setIsDrifting(true);
            setShowAlert(true);

            // Animate member drifting away
            let step = 0;
            const totalSteps = 30;
            const latStep = (MEMBER_DRIFT_END.lat - MEMBER_START.lat) / totalSteps;
            const lngStep = (MEMBER_DRIFT_END.lng - MEMBER_START.lng) / totalSteps;

            driftIntervalRef.current = setInterval(() => {
                step++;
                if (step >= totalSteps) {
                    clearInterval(driftIntervalRef.current);
                    return;
                }
                setMemberPos({
                    lat: MEMBER_START.lat + latStep * step,
                    lng: MEMBER_START.lng + lngStep * step
                });
            }, 100);
        }, DRIFT_TRIGGER_TIME);

        return () => {
            clearTimeout(driftTimer);
            if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
        };
    }, [joined]);

    const handleJoin = (selectedRole) => {
        const code = "DEMO01";
        setGroupCode(code);
        setRole(selectedRole);
        setJoined(true);
    };

    // Calculate meeting point (leader position for demo)
    const meetingPoint = leaderPos;

    // Loading screen
    if (!joined) {
        return (
            <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter italic mb-2">Family Radar</h1>
                        <p className="text-zinc-500 text-sm font-medium">Real-time group safety tracking</p>
                        <div className="mt-4 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full inline-block">
                            <span className="text-orange-500 text-xs font-black uppercase tracking-widest">🎬 DEMO MODE</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-center text-zinc-400 text-sm">Choose your role for the demo:</p>

                        <button
                            onClick={() => handleJoin('leader')}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-600/30"
                        >
                            👑 Join as Leader (Parent)
                        </button>

                        <button
                            onClick={() => handleJoin('member')}
                            className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                        >
                            👤 Join as Member (Child)
                        </button>
                    </div>

                    <p className="text-center text-zinc-600 text-[10px] uppercase tracking-widest">
                        Demo will auto-simulate drift after 5 seconds
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-sans">
            {/* Alert Overlay */}
            {showAlert && (
                <div className="absolute inset-0 z-[100] pointer-events-none">
                    {/* Pulsing Border */}
                    <div className="absolute inset-0 border-[8px] border-red-500/60 animate-pulse"></div>

                    {/* Alert Banner */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
                        <div className={`px-8 py-4 rounded-2xl shadow-2xl ${role === 'leader' ? 'bg-orange-600' : 'bg-red-600'} text-white`}>
                            <div className="flex items-center gap-4">
                                <div className="text-3xl animate-bounce">
                                    {role === 'leader' ? '🛑' : '⚠️'}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest">
                                        {role === 'leader' ? 'MEMBER DRIFTING!' : 'YOU ARE DRIFTING!'}
                                    </h2>
                                    <p className="text-sm font-bold opacity-80">
                                        {role === 'leader' ? 'STAY WHERE YOU ARE. Child is returning.' : 'FOLLOW THE BLUE PATH BACK TO GROUP'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top HUD */}
            <div className="absolute top-4 left-4 right-4 z-[50] flex justify-between items-start pointer-events-none">
                <div className="bg-black/70 backdrop-blur-xl p-4 rounded-2xl border border-white/10 pointer-events-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Group: {groupCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Role:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${role === 'leader' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                            {role === 'leader' ? '👑 Leader' : '👤 Member'}
                        </span>
                    </div>
                </div>

                <div className="bg-black/70 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-right pointer-events-auto">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">STATUS</p>
                    <p className={`text-sm font-black ${isDrifting ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                        {isDrifting ? '⚠️ DRIFT DETECTED' : '✅ ALL SAFE'}
                    </p>
                </div>
            </div>

            {/* Map */}
            <MapContainer
                center={[LEADER_START.lat, LEADER_START.lng]}
                zoom={17}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Leader Dot (Blue) */}
                <Circle
                    center={[leaderPos.lat, leaderPos.lng]}
                    radius={8}
                    pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 3 }}
                >
                    <Tooltip permanent direction="top" className="custom-tooltip">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg">
                            👑 Leader
                        </div>
                    </Tooltip>
                </Circle>

                {/* Member Dot (Orange/Red when drifting) */}
                <Circle
                    center={[memberPos.lat, memberPos.lng]}
                    radius={8}
                    pathOptions={{
                        color: "white",
                        fillColor: isDrifting ? "#ef4444" : "#f97316",
                        fillOpacity: 1,
                        weight: 3
                    }}
                >
                    <Tooltip permanent direction="top" className="custom-tooltip">
                        <div className={`${isDrifting ? 'bg-red-600' : 'bg-orange-600'} text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg`}>
                            👤 Member {isDrifting && '⚠️'}
                        </div>
                    </Tooltip>
                </Circle>

                {/* Meeting Point (Leader Position) */}
                <Circle
                    center={[meetingPoint.lat, meetingPoint.lng]}
                    radius={15}
                    pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.3, weight: 2, dashArray: "5,5" }}
                >
                    <Tooltip permanent direction="bottom" className="custom-tooltip">
                        <div className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
                            📍 Meeting Point
                        </div>
                    </Tooltip>
                </Circle>

                {/* Path from Member to Leader (only when drifting and for member role) */}
                {isDrifting && (
                    <>
                        {/* Glow effect */}
                        <Polyline
                            positions={[[memberPos.lat, memberPos.lng], [leaderPos.lat, leaderPos.lng]]}
                            pathOptions={{ color: "#3b82f6", weight: 12, opacity: 0.3 }}
                        />
                        {/* Main path */}
                        <Polyline
                            positions={[[memberPos.lat, memberPos.lng], [leaderPos.lat, leaderPos.lng]]}
                            pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.9, dashArray: "10, 10" }}
                        />
                        {/* Animated overlay */}
                        <Polyline
                            positions={[[memberPos.lat, memberPos.lng], [leaderPos.lat, leaderPos.lng]]}
                            pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.8, dashArray: "5, 15" }}
                        />
                    </>
                )}
            </MapContainer>

            {/* Bottom Panel */}
            <div className="absolute bottom-6 left-4 right-4 z-[50]">
                <div className="bg-black/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-black text-lg uppercase tracking-tighter">
                                Family Sync Active
                            </h3>
                            <p className="text-zinc-500 text-sm font-medium">
                                {isDrifting
                                    ? (role === 'leader' ? 'Member is returning to group...' : 'Follow blue path back to leader!')
                                    : '2 members connected. All safe.'}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl shadow-lg shadow-blue-600/30">👑</div>
                            <div className={`w-12 h-12 ${isDrifting ? 'bg-red-600 animate-pulse' : 'bg-orange-600'} rounded-full flex items-center justify-center text-xl shadow-lg`}>👤</div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .custom-tooltip::before {
                    display: none;
                }
                .leaflet-tooltip-pane { z-index: 650 !important; }
            `}</style>
        </div>
    );
}

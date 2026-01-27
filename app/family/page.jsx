"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";

// Dynamic Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

export default function FamilyTracker() {
    const [userId] = useState(() => `user-${uuid().slice(0, 8)}`);
    const [userName, setUserName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [view, setView] = useState("choice"); // choice, join, create
    const [isLeader, setIsLeader] = useState(false);
    const [isDrifting, setIsDrifting] = useState(false);

    // Create New Group
    const handleCreateGroup = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setGroupId(newCode);
        setIsLeader(true);
        setView("create");
    };

    const [pos, setPos] = useState(null);
    const [members, setMembers] = useState({});
    const [alert, setAlert] = useState(null);
    const [isGpsActive, setIsGpsActive] = useState(false);

    const mapRef = useRef(null);
    const channelRef = useRef(null);

    // Initialize Icons
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

    // Join Group
    const handleJoin = (e) => {
        e.preventDefault();
        if (userName && groupId) {
            setIsJoined(true);
        }
    };

    // WebSocket Presence Logic
    useEffect(() => {
        if (!isJoined || !groupId) return;

        const channel = supabase.channel(`family-${groupId}`, {
            config: { presence: { key: userId } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const m = {};
                Object.keys(state).forEach(key => {
                    if (key !== userId) m[key] = state[key][0];
                });
                setMembers(m);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                if (key !== userId) {
                    setAlert({ type: 'info', msg: `${newPresences[0].name} joined the family.` });
                    setTimeout(() => setAlert(null), 3000);
                }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                setAlert({ type: 'warn', msg: `${leftPresences[0].name} disconnected.` });
                setTimeout(() => setAlert(null), 3000);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    channelRef.current = channel;
                }
            });

        return () => channel.unsubscribe();
    }, [isJoined, groupId, userId]);

    // Real GPS Sync
    useEffect(() => {
        if (!isJoined) return;

        const watchId = navigator.geolocation.watchPosition(
            (p) => {
                const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };
                setPos(newPos);
                setIsGpsActive(true);

                if (channelRef.current) {
                    channelRef.current.track({
                        lat: p.coords.latitude,
                        lng: p.coords.longitude,
                        name: userName,
                        userId: userId,
                        isLeader: isLeader,
                        timestamp: Date.now()
                    });
                }
            },
            () => setIsGpsActive(false),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isJoined, userName, userId]);

    // Calculate Meeting Point (Leader centric)
    const meetingPoint = useMemo(() => {
        // Find leader among members
        const leaderMember = Object.values(members).find(m => m.isLeader);

        if (isLeader) return pos; // Leader is the meeting point
        if (leaderMember) return { lat: leaderMember.lat, lng: leaderMember.lng };

        // Fallback to average if no leader yet (e.g. initial sync)
        const all = [pos, ...Object.values(members).map(m => ({ lat: m.lat, lng: m.lng }))].filter(Boolean);
        if (all.length < 2) return null;

        const avgLat = all.reduce((s, p) => s + p.lat, 0) / all.length;
        const avgLng = all.reduce((s, p) => s + p.lng, 0) / all.length;
        return { lat: avgLat, lng: avgLng };
    }, [pos, members, isLeader]);

    // Distance Alert Logic with Hysteresis
    useEffect(() => {
        if (!meetingPoint || !pos) return;

        const dist = getDistance(pos, meetingPoint);

        let shouldBeDrifting = isDrifting;
        if (dist > 5) shouldBeDrifting = true;
        else if (dist < 3) shouldBeDrifting = false;

        setIsDrifting(shouldBeDrifting);

        if (isLeader) {
            // Leader logic: Alert if ANY member is too far
            const distantMembers = Object.values(members).filter(m => getDistance({ lat: m.lat, lng: m.lng }, pos) > 5);
            if (distantMembers.length > 0) {
                setAlert({ type: 'warn', msg: "MEMBER DRIFTING! PLEASE WAIT AT YOUR POSITION." });
            } else {
                setAlert(null);
            }
        } else {
            // Follower logic: Alert if I am too far from leader
            if (shouldBeDrifting) {
                setAlert({ type: 'danger', msg: "YOU ARE DRIFTING AWAY! FOLLOW THE PATH TO LEADER." });
            } else {
                setAlert(null);
            }
        }
    }, [pos, meetingPoint, members, isLeader, isDrifting]);

    function getDistance(p1, p2) {
        const R = 6371e3;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    if (!isJoined) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#050810] font-sans">
                <main className="w-[90%] max-w-sm bg-[#0a0f1d] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Family Radar</h1>
                        <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">Real-time Group Safety</p>
                    </div>

                    {view === "choice" && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <button
                                onClick={() => setView("create")}
                                className="w-full bg-blue-600 p-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-between"
                            >
                                Create New Group
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <button
                                onClick={() => setView("join")}
                                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95 flex items-center justify-between"
                            >
                                Join Existing Group
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>
                    )}

                    {(view === "join" || view === "create") && (
                        <form onSubmit={handleJoin} className="space-y-4 animate-in slide-in-from-bottom-4">
                            {view === "create" && (
                                <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl mb-4">
                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-4 text-center">Scan to Join Family Group</p>
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        {!groupId && handleCreateGroup()}
                                        <div className="bg-white p-3 rounded-2xl shadow-xl">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${groupId}`}
                                                alt="Group QR"
                                                className="w-32 h-32"
                                            />
                                        </div>
                                        <span className="text-2xl font-black text-white tracking-[0.3em] bg-black/40 px-6 py-2 rounded-xl border border-white/10">{groupId}</span>
                                    </div>
                                </div>
                            )}

                            <input
                                required
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold text-sm"
                                placeholder="YOUR NAME"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                            />

                            {view === "join" && (
                                <input
                                    required
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold text-sm uppercase"
                                    placeholder="ENTER GROUP CODE"
                                    value={groupId}
                                    onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                                />
                            )}

                            <button className="w-full bg-blue-600 p-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 mt-2">
                                {view === "create" ? "Initialize & Sync" : "Connect to Family"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setView("choice"); setGroupId(""); }}
                                className="w-full text-[10px] text-white/30 font-bold uppercase tracking-widest py-2 hover:text-white/60 transition-colors"
                            >
                                ← Go Back
                            </button>
                        </form>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
            {/* Header HUD */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 pointer-events-auto ${isGpsActive ? 'bg-emerald-600' : 'bg-red-600'}`}>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        {isGpsActive ? 'FAMILY RADAR ACTIVE' : 'GPS SEARCHING...'}
                    </div>
                    <div className="bg-black/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-white font-mono text-xs pointer-events-auto shadow-2xl">
                        <p className="text-blue-400 font-bold mb-1 underline text-[10px] tracking-widest uppercase">GROUP: {groupId}</p>
                        <p className="flex justify-between gap-4 font-black mt-2 text-lg">MEMBERS: <span className="text-yellow-400">0{Object.keys(members).length + 1}</span></p>
                    </div>
                </div>
            </div>

            {/* Notification Alert Overlay */}
            {alert && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm pointer-events-none animate-in slide-in-from-top-5">
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-2xl backdrop-blur-lg ${alert.type === 'danger' ? 'bg-rose-600 border-rose-400' :
                        alert.type === 'warn' ? 'bg-amber-600 border-amber-400' : 'bg-blue-600 border-blue-400'
                        }`}>
                        <div className="bg-white/20 p-2 rounded-xl">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-white">{alert.msg}</p>
                    </div>
                </div>
            )}

            {/* Bottom Meeting HUD */}
            {meetingPoint && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm pointer-events-none">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-3xl text-black animate-in slide-in-from-bottom-5 pointer-events-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-blue-600 p-3 rounded-2xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">Meeting Center</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Follow your personal meeting path</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-100 p-3 rounded-2xl flex flex-col items-center">
                                <span className="text-[8px] font-black text-gray-400 uppercase">You are</span>
                                <span className="text-xl font-black text-blue-600">{Math.round(getDistance(pos || { lat: 0, lng: 0 }, meetingPoint))}m</span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase">From Center</span>
                            </div>
                            <button onClick={() => mapRef.current?.flyTo([meetingPoint.lat, meetingPoint.lng], 18)} className="bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all">
                                Center Map
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!pos ? (
                <div className="h-full w-full flex items-center justify-center bg-black">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="font-mono text-xs text-blue-400">CALIBRATING GPS RADAR...</p>
                    </div>
                </div>
            ) : (
                <MapContainer
                    center={[pos.lat, pos.lng]}
                    zoom={18}
                    className="h-full w-full bg-black z-0"
                    zoomControl={false}
                    ref={mapRef}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />

                    {/* All Family Members */}
                    {Object.keys(members).map(id => (
                        <Circle
                            key={id}
                            center={[members[id].lat, members[id].lng]}
                            radius={4}
                            pathOptions={{
                                color: 'white',
                                fillColor: members[id].isLeader ? '#fbbf24' : '#3b82f6',
                                fillOpacity: 1,
                                weight: members[id].isLeader ? 3 : 2
                            }}
                        >
                            <Tooltip permanent direction="top" className="family-label">
                                <div className={`${members[id].isLeader ? 'bg-amber-600' : 'bg-blue-600'} text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1`}>
                                    {members[id].isLeader && <span className="text-[10px]">👑</span>}
                                    {members[id].name}
                                </div>
                            </Tooltip>
                            {/* Path from member to meeting point */}
                            {meetingPoint && (
                                <Polyline
                                    positions={[[members[id].lat, members[id].lng], [meetingPoint.lat, meetingPoint.lng]]}
                                    pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 10', opacity: 0.3 }}
                                />
                            )}
                        </Circle>
                    ))}

                    {/* Meeting Point Star */}
                    {meetingPoint && (
                        <>
                            <Circle
                                center={[meetingPoint.lat, meetingPoint.lng]}
                                radius={6}
                                pathOptions={{ color: '#fbbf24', fillColor: 'transparent', weight: 2, dashArray: '4, 4' }}
                            />
                            <Circle
                                center={[meetingPoint.lat, meetingPoint.lng]}
                                radius={2}
                                pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 1 }}
                            />
                        </>
                    )}

                    {/* YOUR Path to Meeting Point */}
                    {meetingPoint && pos && (
                        <Polyline
                            positions={[[pos.lat, pos.lng], [meetingPoint.lat, meetingPoint.lng]]}
                            pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }}
                        />
                    )}

                    {/* YOUR Marker */}
                    <Circle
                        center={[pos.lat, pos.lng]}
                        radius={5}
                        pathOptions={{
                            color: 'white',
                            fillColor: isLeader ? '#fbbf24' : '#22c55e',
                            fillOpacity: 1,
                            weight: 3
                        }}
                    >
                        <Tooltip permanent direction="top" className="family-label">
                            <div className={`${isLeader ? 'bg-amber-600' : 'bg-emerald-600'} text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1`}>
                                {isLeader && <span className="text-[10px]">👑</span>}
                                YOU {isLeader ? '(LEADER)' : ''}
                            </div>
                        </Tooltip>
                    </Circle>
                </MapContainer>
            )}

            <style jsx global>{`
                .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
                .family-label { background: transparent !important; border: none !important; box-shadow: none !important; }
                .animate-in { animation: slide-in 0.3s ease-out; }
                @keyframes slide-in { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>
        </div>
    );
}

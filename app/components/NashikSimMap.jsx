"use client";

import { MapContainer, TileLayer, Polygon, Circle, Tooltip, Polyline } from "react-leaflet";
import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";
import { LAT_STEP, LNG_STEP } from "@/lib/grid";

function isPointInPoly(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getRandomPointInPoly(points) {
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    let point = null;
    let attempts = 0;
    while (!point || !isPointInPoly(point, points)) {
        point = [
            minLat + Math.random() * (maxLat - minLat),
            minLng + Math.random() * (maxLng - minLng)
        ];
        attempts++;
        if (attempts > 100) return points[0]; // Fallback
    }
    return point;
}

export default function NashikSimMap({ points, mapCenter, namePrefix = "Nashik-Sim" }) {
    const [userId] = useState("nashik-sim-" + uuid().slice(0, 8));
    const [pos, setPos] = useState(null);
    const posRef = useRef(null);
    const [nearby, setNearby] = useState([]);
    const [gridCrowd, setGridCrowd] = useState([]);
    const [myCell, setMyCell] = useState(null);
    const [myRank, setMyRank] = useState(1);
    const [alert, setAlert] = useState(false);
    const [navigationPath, setNavigationPath] = useState(null);
    const [recommendedCell, setRecommendedCell] = useState(null);
    const [manualTarget, setManualTarget] = useState(null);
    const [forceSafePath, setForceSafePath] = useState(false);
    const [crowdLimit, setCrowdLimit] = useState(2);
    const [isLoading, setIsLoading] = useState(false);

    // Initial random spawn
    useEffect(() => {
        const startPos = getRandomPointInPoly(points);
        const p = { lat: startPos[0], lng: startPos[1] };
        setPos(p);
        posRef.current = p;
    }, [points]);

    // Fix leaflet icons
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

    // Sync with Simulation API
    useEffect(() => {
        if (!pos) return;
        const sync = async () => {
            const currentPos = posRef.current || pos;
            setIsLoading(true);
            try {
                const query = new URLSearchParams({
                    userId,
                    lat: currentPos.lat.toString(),
                    lng: currentPos.lng.toString(),
                    forceSafePath: forceSafePath.toString()
                });

                if (manualTarget) {
                    query.set("targetLat", manualTarget.lat.toString());
                    query.set("targetLng", manualTarget.lng.toString());
                }

                const res = await fetch(`/api/location/sim?${query.toString()}`);
                const data = await res.json();

                setNearby(data.nearby || []);
                setGridCrowd(data.gridCrowd || []);
                setMyCell(data.myCell);
                setMyRank(data.myRank || 1);
                setAlert(data.alert);
                setRecommendedCell(data.recommendation);
                setCrowdLimit(data.crowdLimit);

                if (data.safestPath) {
                    setNavigationPath(data.safestPath);
                } else if (!manualTarget && !data.recommendation) {
                    setNavigationPath(null);
                }
            } catch (err) {
                console.error("Sync error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        sync();
    }, [userId, forceSafePath, manualTarget, pos]);

    const handleCellClick = (cell) => {
        setManualTarget({
            lat: cell.lat + LAT_STEP / 2,
            lng: cell.lng + LNG_STEP / 2,
            cellId: cell.id
        });
        setForceSafePath(true);
    };

    if (!pos) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-blue-400 font-mono italic animate-pulse tracking-widest uppercase">Initializing Nashik Grid Area...</div>;

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-sans">
            {/* Simulation HUD */}
            <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col gap-4 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="bg-red-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse pointer-events-auto inline-block">
                            Regional Sim: OFF-ROAD
                        </div>
                        <h1 className="text-white text-3xl font-black tracking-tighter drop-shadow-lg">{namePrefix}</h1>
                    </div>

                    <div className="bg-zinc-900/90 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-white font-mono text-[10px] pointer-events-auto shadow-2xl min-w-[180px]">
                        <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                            <span className="text-blue-400 font-black uppercase tracking-widest">LIVE HUD</span>
                        </div>
                        <div className="space-y-1.5 opacity-80">
                            <p>RANK: <span className="text-yellow-400 font-bold">#{myRank}</span></p>
                            <p>LIMIT: <span className="text-white font-bold">{crowdLimit} PILGRIMS</span></p>
                            <p>STATUS: <span className={alert ? "text-red-500 font-bold" : "text-green-500 font-bold"}>{alert ? "⚠️ CROWDED" : "✅ CLEAR"}</span></p>
                        </div>
                        {isLoading && <p className="text-blue-400 mt-3 animate-pulse font-black italic"> CALCULATING DETOURS...</p>}
                    </div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => {
                            setForceSafePath(!forceSafePath);
                            if (!forceSafePath) setManualTarget(null);
                        }}
                        className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-2xl border ${forceSafePath ? 'bg-red-500 border-red-400 text-white' : 'bg-white border-white text-black hover:bg-zinc-200'}`}
                    >
                        {forceSafePath ? '🧭 AI PATH: TRIGGERED' : '🧭 GENERATE SAFEST PATH'}
                    </button>
                    {manualTarget && (
                        <button
                            onClick={() => { setManualTarget(null); setNavigationPath(null); }}
                            className="w-14 h-14 bg-zinc-800 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-zinc-700 border border-white/5"
                        >
                            ✕
                        </button>
                    ) : (
                    <button
                        onClick={() => window.location.reload()}
                        className="w-14 h-14 bg-zinc-800 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-zinc-700 border border-white/5"
                    >
                        ↻
                    </button>
                    )}
                </div>
            </div>

            {/* Path Guidance Alert */}
            {(navigationPath) && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm pointer-events-none">
                    <div className="bg-blue-600/95 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-3xl border border-blue-400/50 animate-in slide-in-from-bottom-10 pointer-events-auto text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl animate-bounce">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">AI Navigation</h3>
                                <p className="text-[10px] text-blue-100 opacity-70 font-bold uppercase tracking-widest mt-0.5">Safest route calculated</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MapContainer center={[pos.lat, pos.lng]} zoom={18} className="h-full w-full z-0" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Regional Boundary */}
                <Polygon positions={points} pathOptions={{ color: "red", weight: 3, fillOpacity: 0.05, dashArray: "10, 10" }} />

                {/* Grid cells optimized for Nashik region */}
                {gridCrowd.map((cell, idx) => {
                    const isInside = isPointInPoly([cell.lat + LAT_STEP / 2, cell.lng + LNG_STEP / 2], points);
                    if (!isInside && cell.id !== myCell) return null; // Only show cells within the Nashik polygon

                    const isMe = cell.id === myCell;
                    const isRec = recommendedCell && cell.id === recommendedCell.id;
                    const isSel = manualTarget && cell.id === manualTarget.cellId;
                    const isHazard = cell.count > crowdLimit;

                    let color = "#10b981";
                    if (isHazard) color = "#ef4444";
                    else if (cell.count > 0) color = "#f59e0b";
                    if (isRec || isSel) color = "#3b82f6";

                    const opacity = isMe ? 0.6 : (isInside ? 0.35 : 0.1);

                    return (
                        <Polygon
                            key={cell.id}
                            positions={[
                                [cell.lat, cell.lng],
                                [cell.lat + LAT_STEP, cell.lng],
                                [cell.lat + LAT_STEP, cell.lng + LNG_STEP],
                                [cell.lat, cell.lng + LNG_STEP]
                            ]}
                            pathOptions={{
                                color: isSel ? "#3b82f6" : "white",
                                fillColor: color,
                                fillOpacity: opacity,
                                weight: isMe || isRec || isSel ? 3 : 0.5
                            }}
                            eventHandlers={{
                                click: () => handleCellClick(cell)
                            }}
                        >
                            <Tooltip permanent={isMe || isRec || isSel} direction="center" className="sim-tooltip">
                                <div className="text-[8px] font-black text-white text-shadow uppercase">
                                    {isMe ? 'YOU' : (isSel ? 'TARGET' : (isRec ? 'RECO' : `SEC ${idx}`))}
                                    <br />👥 {cell.count}
                                </div>
                            </Tooltip>
                        </Polygon>
                    );
                })}

                {/* Path Visualization */}
                {navigationPath && (
                    <>
                        <Polyline positions={navigationPath} pathOptions={{ color: "#3b82f6", weight: 10, opacity: 0.3, lineCap: "round" }} />
                        <Polyline positions={navigationPath} pathOptions={{ color: "#ffffff", weight: 2, dashArray: "5, 15", opacity: 0.8 }} />
                    </>
                )}

                {/* Markers */}
                {nearby.map((u) => (
                    <Circle key={u.id} center={[u.lat, u.lng]} radius={2} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.8 }} />
                ))}

                <Circle center={[pos.lat, pos.lng]} radius={4} pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 3 }} />

                {manualTarget && (
                    <Circle center={[manualTarget.lat, manualTarget.lng]} radius={6} pathOptions={{ color: "#3b82f6", fillColor: "white", fillOpacity: 1, weight: 4 }} />
                )}
            </MapContainer>

            <style jsx global>{`
                .sim-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
                .text-shadow { text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
                .leaflet-container { background: #000 !important; }
            `}</style>
        </div>
    );
}

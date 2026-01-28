"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";

import { LAT_STEP, LNG_STEP } from "@/lib/grid";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

const testPolygon = [
    [19.97416621742478, 73.74351739883424],
    [19.974024861676334, 73.7462103366852],
    [19.971874219298314, 73.74585628509523],
    [19.971965092105087, 73.74343156814577]
];

const simCenter = [19.973, 73.7448];

export default function SimulationTracker() {
    const [userId] = useState("sim-user-" + uuid().slice(0, 8));
    const [pos, setPos] = useState(null);
    const posRef = useState({ current: null })[0];
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

    // GPS with fallback to simCenter for testing
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
                () => setPos({ lat: simCenter[0], lng: simCenter[1] }),
                { enableHighAccuracy: true }
            );
            const watchId = navigator.geolocation.watchPosition(
                (p) => {
                    const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };
                    setPos(newPos);
                    posRef.current = newPos;
                },
                null,
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            setPos({ lat: simCenter[0], lng: simCenter[1] });
        }
    }, []);

    // Sync with Simulation API
    useEffect(() => {
        if (!pos) return;
        const sync = async () => {
            const currentPos = posRef.current || pos;
            if (!currentPos) return;

            setIsLoading(true);
            try {
                /* 
                   Location update disabled to save resources as requested.
                   await fetch("/api/location/update", {
                       method: "POST",
                       body: JSON.stringify({ userId, lat: currentPos.lat, lng: currentPos.lng }),
                   });
                */

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

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

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
        // Removed Interval: Only sync when user explicitly changes target or mode parameters.
        // This stops "too many requests" and minimizes resource usage.
    }, [userId, forceSafePath, manualTarget]);

    const handleCellClick = (e, cell) => {
        // Silently prevent clicking on red zones (crowded cells)
        if (cell.count > crowdLimit) {
            return;
        }

        // Set the center of the cell as the target
        const targetLat = cell.lat + LAT_STEP / 2;
        const targetLng = cell.lng + LNG_STEP / 2;

        setManualTarget({
            lat: targetLat,
            lng: targetLng,
            cellId: cell.id
        });
    };

    const clearTarget = () => {
        setManualTarget(null);
        setNavigationPath(null);
    };

    if (!pos) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-blue-400 font-mono">LOADING SIMULATION...</div>;

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-sans">
            {/* Simulation Header */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse pointer-events-auto">
                        Test Simulation Mode
                    </div>
                    <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white font-mono text-xs pointer-events-auto shadow-2xl">
                        <p className="text-blue-400 font-bold mb-1 underline">SIMULATION HUD</p>
                        <p>RANK: <span className="text-yellow-400 font-bold">#{myRank}</span></p>
                        <p>LIMIT: <span className="text-white font-bold">{crowdLimit} PER CELL</span></p>
                        {isLoading && <p className="text-green-400 mt-1">⟳ Calculating...</p>}
                    </div>
                </div>

                <div className="flex justify-between items-center gap-2 pointer-events-auto">
                    <button
                        onClick={() => {
                            setForceSafePath(!forceSafePath);
                            if (!forceSafePath) setManualTarget(null);
                        }}
                        className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all shadow-md ${forceSafePath ? 'bg-red-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                    >
                        {forceSafePath ? '🧭 ON' : '🧭 SAFE PATH'}
                    </button>
                    {manualTarget && (
                        <button
                            onClick={clearTarget}
                            className="w-10 h-10 bg-zinc-800 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-zinc-700 text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Rerouting Overlay */}
            {(recommendedCell || manualTarget) && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm pointer-events-none">
                    <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-3xl border border-blue-400/50 animate-in slide-in-from-bottom-5 pointer-events-auto text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">
                                    {manualTarget ? 'Navigate to Selected Zone' : 'Proceed to Safe Zone'}
                                </h3>
                                <p className="text-xs text-blue-100 opacity-70">
                                    {manualTarget ? 'Safest route calculated' : 'Redirecting to avoid crowd bottleneck'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-3 flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Destination</span>
                            <span className="font-mono text-xs font-black bg-white text-blue-600 px-3 py-1 rounded-lg">
                                {manualTarget ? `CELL ${manualTarget.cellId}` : `AUTO SAFE ZONE`}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <MapContainer center={[pos.lat, pos.lng]} zoom={18} className="h-full w-full z-0" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Test Boundary */}
                <Polygon positions={testPolygon} pathOptions={{ color: "blue", weight: 2, fillOpacity: 0.05, dashArray: "5, 10" }} />

                {/* Grid cells */}
                {(() => {
                    // Always generate 7x7 grid around user
                    const myRLat = Math.floor(pos.lat / LAT_STEP);
                    const myRLng = Math.floor(pos.lng / LNG_STEP);

                    // Create base grid
                    const baseGrid = Array.from({ length: 49 }).map((_, i) => {
                        const r = Math.floor(i / 7) - 3;
                        const c = (i % 7) - 3;
                        const rid = (myRLat + r);
                        const cid = (myRLng + c);
                        const cellId = `${rid},${cid}`;

                        // Find matching cell from API data
                        const apiCell = gridCrowd.find(gc => gc.id === cellId);

                        // Create a larger red zone (5 cells) to the right and above the user
                        // Pattern: forms an L-shape obstacle
                        const isRedZone = (
                            (r === 0 && c === 1) ||  // Right of user
                            (r === 0 && c === 2) ||  // 2 cells right
                            (r === -1 && c === 1) || // Above-right
                            (r === -1 && c === 2) || // Above-right diagonal
                            (r === 1 && c === 1)     // Below-right
                        );

                        return {
                            id: cellId,
                            lat: rid * LAT_STEP,
                            lng: cid * LNG_STEP,
                            count: isRedZone ? (crowdLimit + 5) : (apiCell ? apiCell.count : 0)
                        };
                    });

                    return baseGrid;
                })().map((cell, idx) => {
                    const isMe = cell.id === myCell;
                    const isRec = recommendedCell && cell.id === recommendedCell.id;
                    const isSel = manualTarget && cell.id === manualTarget.cellId;
                    const isSimRed = cell.count > crowdLimit;

                    let color = "#10b981";
                    if (isSimRed) color = "#ef4444";
                    else if (cell.count > 0) color = "#f59e0b";
                    if (isRec || isSel) color = "#3b82f6";

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
                                color: isRec || isSel ? "#3b82f6" : "white",
                                fillColor: color,
                                fillOpacity: isMe ? 0.6 : (isSimRed ? 0.5 : 0.35),
                                weight: isMe || isRec || isSel ? 3 : 0.5,
                                className: isSimRed ? 'red-zone-blocked' : 'cell-clickable'
                            }}
                            eventHandlers={{
                                click: (e) => handleCellClick(e, cell)
                            }}
                        >
                            <Tooltip permanent={isMe || isRec || isSel} direction="center" className="sim-tooltip">
                                <div className="text-[9px] font-black text-white text-shadow">
                                    {isMe ? 'YOU' : (isSel ? 'TARGET' : (isRec ? 'RECO' : `SEC ${idx}`))}
                                    <br />👥 {cell.count}
                                </div>
                            </Tooltip>
                        </Polygon>
                    );
                })}

                {/* Safest AI Route Visualization */}
                {navigationPath && navigationPath.length > 0 && (
                    <>
                        <Polyline
                            positions={navigationPath}
                            pathOptions={{ color: "#3b82f6", weight: 8, lineCap: "round", opacity: 0.3, className: "glow-path" }}
                        />
                        <Polyline
                            positions={navigationPath}
                            pathOptions={{ color: "#ffffff", weight: 2, lineCap: "round", opacity: 0.8, dashArray: "1, 12" }}
                        />
                    </>
                )}

                {/* User Dot */}
                <Circle center={[pos.lat, pos.lng]} radius={4} pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }} />

                {/* Target Marker */}
                {manualTarget && (
                    <Circle
                        center={[manualTarget.lat, manualTarget.lng]}
                        radius={6}
                        pathOptions={{ color: "#3b82f6", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}
                    />
                )}
            </MapContainer>

            <style jsx global>{`
                .sim-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
                .text-shadow { text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
                .leaflet-container { background: #000 !important; }
                
                /* Cursor feedback for cells */
                .red-zone-blocked { cursor: not-allowed !important; }
                .cell-clickable { cursor: pointer !important; }
                
                @keyframes slide-in-from-bottom-5 {
                    from { transform: translateY(20px) translateX(-50%); opacity: 0; }
                    to { transform: translateY(0) translateX(-50%); opacity: 1; }
                }
                .animate-in { animation: slide-in-from-bottom-5 0.3s ease-out; }
            `}</style>
        </div>
    );
}
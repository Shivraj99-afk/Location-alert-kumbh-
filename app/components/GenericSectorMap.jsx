"use client";

import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, Circle } from "react-leaflet";
import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ----------------------
// LOGIC: Grid Subdivision
// ----------------------
function generateGridSections(points, rows = 5, cols = 5) {
    const sections = [];

    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latStep = (maxLat - minLat) / rows;
    const lngStep = (maxLng - minLng) / cols;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const nLat = maxLat - (r * latStep);
            const sLat = maxLat - ((r + 1) * latStep);
            const wLng = minLng + (c * lngStep);
            const eLng = minLng + ((c + 1) * lngStep);

            const cellPolygon = [
                [nLat, wLng],
                [nLat, eLng],
                [sLat, eLng],
                [sLat, wLng]
            ];

            const center = [(nLat + sLat) / 2, (wLng + eLng) / 2];
            if (isPointInPoly(center, points)) {
                sections.push({
                    id: `section-${r}-${c}`,
                    name: `Zone ${String.fromCharCode(65 + r)}${c + 1}`,
                    polygon: cellPolygon
                });
            }
        }
    }
    return sections;
}

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

const crowdLevels = {
    null: { color: "#94a3b8", label: "Clear", fillColor: "#94a3b8" },
    1: { color: "#10b981", label: "Low Density", fillColor: "#10b981" },
    2: { color: "#f59e0b", label: "Medium Density", fillColor: "#f59e0b" },
    3: { color: "#f43f5e", label: "High Density", fillColor: "#f43f5e" }
};

export default function GenericSectorMap({ points, crowdRoad = [], safeRoad = [], startPos = null, mapCenter, namePrefix = "Zone", rows = 5, cols = 5 }) {
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [sectionCrowd, setSectionCrowd] = useState({});
    const [image, setImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [detectedLevel, setDetectedLevel] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Simulation states
    const [simPersonPos, setSimPersonPos] = useState(startPos);
    const [simRunning, setSimRunning] = useState(false);
    const simIntervalRef = useRef(null);

    // Fix leaflet icons
    useEffect(() => {
        const L = require("leaflet");
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
    }, []);

    const gridSections = useMemo(() => generateGridSections(points, rows, cols), [points, rows, cols]);

    // Sync shared data once on load
    useEffect(() => {
        const syncData = async () => {
            try {
                const res = await fetch("/api/crowd/update");
                const data = await res.json();

                // If no data, populate with some random demo data for visualization
                if (Object.keys(data).length === 0) {
                    const demoData = {};
                    gridSections.forEach(s => {
                        // Randomly assign 1 (Low), 2 (Medium), 3 (High) or null
                        const rand = Math.random();
                        if (rand > 0.4) {
                            demoData[`${namePrefix}-${s.id}`] = Math.floor(Math.random() * 3) + 1;
                        }
                    });
                    setSectionCrowd(demoData);
                } else {
                    setSectionCrowd(data);
                }
            } catch (err) {
                console.error("Sync error:", err);
            }
        };

        syncData();
    }, []);

    const handleSimStart = () => {
        if (simRunning || !startPos || safeRoad.length === 0) return;

        setSimRunning(true);
        setSimPersonPos(startPos);

        const fullPath = [startPos, ...[...safeRoad].reverse()]; // Join start to end of safe path
        let pointIndex = 0;
        let stepIndex = 0;
        const STEPS_PER_SEGMENT = 20;

        const move = () => {
            if (pointIndex >= fullPath.length - 1) {
                setSimRunning(false);
                clearInterval(simIntervalRef.current);
                return;
            }

            const start = fullPath[pointIndex];
            const end = fullPath[pointIndex + 1];

            const nextLat = start[0] + (end[0] - start[0]) * (stepIndex / STEPS_PER_SEGMENT);
            const nextLng = start[1] + (end[1] - start[1]) * (stepIndex / STEPS_PER_SEGMENT);

            setSimPersonPos([nextLat, nextLng]);

            stepIndex++;
            if (stepIndex > STEPS_PER_SEGMENT) {
                stepIndex = 0;
                pointIndex++;
            }
        };

        simIntervalRef.current = setInterval(move, 50);
    };

    const handleSectionClick = (id) => {
        setSelectedSectionId(id);
        setImage(null);
        setDetectedLevel(null);
        setSuccess(false);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            setImage(base64);
            analyzeImage(base64);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async (base64) => {
        setAnalyzing(true);
        setDetectedLevel(null);
        try {
            const res = await fetch("/api/crowd/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64 })
            });
            const data = await res.json();
            if (data.success) {
                setDetectedLevel(data.level);
            } else {
                alert("AI Analysis failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    };

    const submitReport = async () => {
        if (!selectedSectionId || !detectedLevel) return;

        try {
            const res = await fetch("/api/crowd/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectionId: `${namePrefix}-${selectedSectionId}`,
                    level: detectedLevel,
                    timestamp: Date.now()
                })
            });
            if (res.ok) {
                setSuccess(true);
                setSectionCrowd(prev => ({ ...prev, [`${namePrefix}-${selectedSectionId}`]: detectedLevel }));
                setTimeout(() => {
                    handleClose();
                }, 2000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClose = () => {
        setSelectedSectionId(null);
        setImage(null);
        setDetectedLevel(null);
        setSuccess(false);
    };

    const currentSection = gridSections.find(s => s.id === selectedSectionId);

    return (
        <div className="relative w-full h-screen bg-gray-100">
            <style jsx global>{`
                .crowd-line-glow {
                    filter: drop-shadow(0 0 8px rgba(244, 63, 94, 0.8));
                    animation: crowd-pulse 2s infinite ease-in-out;
                }
                .safe-line-glow {
                    filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
                }
                .bot-glow {
                    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));
                    animation: bot-pulse 1.5s infinite ease-in-out;
                }
                @keyframes bot-pulse {
                    0% { radius: 6; opacity: 0.7; }
                    50% { radius: 9; opacity: 1; }
                    100% { radius: 6; opacity: 0.7; }
                }
                @keyframes crowd-pulse {
                    0% { opacity: 0.6; stroke-width: 8; }
                    50% { opacity: 1; stroke-width: 12; }
                    100% { opacity: 0.6; stroke-width: 8; }
                }
                .sim-btn {
                    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
                }
                .bot-label { background: transparent !important; border: none !important; box-shadow: none !important; }
                .sector-tooltip {
                    background: rgba(0,0,0,0.8) !important;
                    border: 1px solid rgba(255,255,255,0.2) !important;
                    color: white !important;
                    border-radius: 8px !important;
                    padding: 4px 8px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    font-size: 10px !important;
                    letter-spacing: 0.05em !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                }
            `}</style>

            {/* Simulation Controls */}
            {startPos && (
                <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
                    <button
                        onClick={handleSimStart}
                        disabled={simRunning}
                        className={`sim-btn px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${simRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}`}
                    >
                        {simRunning ? 'Simulation Running...' : '🚀 Start Simulation'}
                    </button>
                    {simRunning && (
                        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold text-blue-600 border border-blue-100 animate-pulse uppercase tracking-widest">
                            Navigating to Safe Zone...
                        </div>
                    )}
                </div>
            )}

            {/* Density Legend */}
            <div className="absolute top-6 right-20 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20 flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500 mb-1 border-b pb-2">Crowd Density</p>
                {Object.entries(crowdLevels).filter(([key]) => key !== 'null').reverse().map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: value.fillColor }}></div>
                        <span className="text-[11px] font-bold text-gray-700">{value.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-3 opacity-60">
                    <div className="w-4 h-4 rounded-full bg-slate-400 shadow-inner"></div>
                    <span className="text-[11px] font-bold text-gray-700">Clear / No Data</span>
                </div>
            </div>

            <MapContainer
                center={mapCenter}
                zoom={17}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <Polygon
                    positions={points}
                    pathOptions={{ color: "red", weight: 3, fillOpacity: 0.05, dashArray: "5, 5" }}
                />

                {/* Highly Crowded Road (Red) */}
                {crowdRoad.length > 0 && (
                    <>
                        <Polyline
                            positions={crowdRoad}
                            pathOptions={{
                                color: "#f43f5e",
                                weight: 10,
                                opacity: 0.8,
                                lineCap: 'round',
                                className: 'crowd-line-glow'
                            }}
                        >
                            <Tooltip sticky>
                                <div className="px-3 py-1 font-black text-rose-600 uppercase text-[10px] tracking-tighter">
                                    ⚠️ Heavy Road Crowd
                                </div>
                            </Tooltip>
                        </Polyline>
                        <Polyline
                            positions={crowdRoad}
                            pathOptions={{
                                color: "white",
                                weight: 2,
                                dashArray: '5, 10',
                                opacity: 0.5
                            }}
                        />
                    </>
                )}

                {/* Safe Road (Green) */}
                {safeRoad.length > 0 && (
                    <>
                        <Polyline
                            positions={safeRoad}
                            pathOptions={{
                                color: "#10b981",
                                weight: 8,
                                opacity: 0.8,
                                lineCap: 'round',
                                className: 'safe-line-glow'
                            }}
                        >
                            <Tooltip sticky>
                                <div className="px-3 py-1 font-black text-emerald-600 uppercase text-[10px] tracking-tighter">
                                    ✅ Safe Route
                                </div>
                            </Tooltip>
                        </Polyline>
                        <Polyline
                            positions={safeRoad}
                            pathOptions={{
                                color: "white",
                                weight: 1.5,
                                dashArray: '8, 12',
                                opacity: 0.4
                            }}
                        />
                    </>
                )}

                {/* Moving Person Dot */}
                {simPersonPos && (
                    <Circle
                        center={simPersonPos}
                        radius={6}
                        pathOptions={{
                            color: "white",
                            fillColor: "#3b82f6",
                            fillOpacity: 1,
                            weight: 3,
                            className: 'bot-glow'
                        }}
                    >
                        <Tooltip permanent direction="top" className="bot-label">
                            <div className="bg-blue-600 text-white px-1.5 py-2 rounded text-[8px] font-black uppercase tracking-widest">User</div>
                        </Tooltip>
                    </Circle>
                )}

                {gridSections.map((section) => {
                    const crowdLevel = sectionCrowd[`${namePrefix}-${section.id}`];
                    const style = crowdLevels[crowdLevel] || crowdLevels.null;
                    const isSelected = selectedSectionId === section.id;

                    return (
                        <Polygon
                            key={section.id}
                            positions={section.polygon}
                            pathOptions={{
                                color: isSelected ? "#3b82f6" : "white",
                                weight: isSelected ? 3 : 1,
                                fillColor: style.fillColor,
                                fillOpacity: isSelected ? 0.75 : 0.5,
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    handleSectionClick(section.id);
                                },
                            }}
                        >
                            <Tooltip direction="center" className="sector-tooltip">
                                <div className="flex flex-col items-center">
                                    <span>{section.name}</span>
                                    <span style={{ color: style.fillColor === "#94a3b8" ? "white" : style.fillColor }}>{style.label}</span>
                                </div>
                            </Tooltip>
                        </Polygon>
                    );
                })}
            </MapContainer>

            {selectedSectionId && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[1000] bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100 w-[90%] max-w-[380px] animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-none">{namePrefix} {currentSection?.name}</h3>
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">AI Verified Reporting</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-black"
                        >
                            ✕
                        </button>
                    </div>

                    {!image ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video bg-gray-50 rounded-2x border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all flex flex-col items-center justify-center cursor-pointer group mb-2"
                        >
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <span className="text-sm font-bold text-gray-600">Upload Crowd Photo</span>
                            <span className="text-[10px] text-gray-400 uppercase font-black mt-1">For AI Analysis</span>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative aspect-video rounded-2xl overflow-hidden ring-4 ring-gray-100">
                                <img src={image} className="w-full h-full object-cover" />
                                {analyzing && (
                                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Scanning...</span>
                                    </div>
                                )}
                            </div>

                            {detectedLevel && !analyzing && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">AI Detected</span>
                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${detectedLevel === 1 ? 'bg-green-100 text-green-600' :
                                            detectedLevel === 2 ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-red-100 text-red-600'
                                            }`}>
                                            {crowdLevels[detectedLevel].label}
                                        </span>
                                    </div>

                                    <button
                                        onClick={submitReport}
                                        disabled={success}
                                        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${success
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                                            }`}
                                    >
                                        {success ? '✓ Verified & Reported' : 'Confirm Forecast'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}


            <a href="/location" className="absolute top-6 right-6 z-[1000] bg-white p-3 rounded-full shadow-lg border border-gray-100 font-bold text-blue-600 hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </a>
        </div>
    );
}


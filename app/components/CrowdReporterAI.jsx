"use client";

import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const mainPolygonPoints = [
    [20.0090101, 73.7918293], // NW
    [20.0091008, 73.7926876], // NE
    [20.0085564, 73.7930417], // Mid-East
    [20.0081633, 73.7928485], // SE
    [20.0080927, 73.7920546], // SW
    [20.0086472, 73.7917971]  // Mid-West
];

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
                    name: `Sector ${String.fromCharCode(65 + r)}${c + 1}`,
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
    null: { color: "#3b82f6", label: "Pending", fillColor: "#3b82f6" },
    1: { color: "#22c55e", label: "Low", fillColor: "#22c55e" },
    2: { color: "#eab308", label: "Medium", fillColor: "#eab308" },
    3: { color: "#ef4444", label: "Heavy", fillColor: "#ef4444" }
};

export default function CrowdReporterAI() {
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [image, setImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [detectedLevel, setDetectedLevel] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const L = require("leaflet");
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
    }, []);

    const gridSections = useMemo(() => generateGridSections(mainPolygonPoints, 5, 5), []);

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
                    sectionId: selectedSectionId,
                    level: detectedLevel,
                    timestamp: Date.now()
                })
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setSelectedSectionId(null);
                    setImage(null);
                    setDetectedLevel(null);
                }, 3000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const currentSection = gridSections.find(s => s.id === selectedSectionId);

    return (
        <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapContainer
                    center={[20.0086, 73.7924]}
                    zoom={18}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={false}
                >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    {gridSections.map((section) => (
                        <Polygon
                            key={section.id}
                            positions={section.polygon}
                            pathOptions={{
                                color: selectedSectionId === section.id ? "#3b82f6" : "#475569",
                                weight: selectedSectionId === section.id ? 3 : 1,
                                fillColor: selectedSectionId === section.id ? "#3b82f6" : "transparent",
                                fillOpacity: selectedSectionId === section.id ? 0.3 : 0,
                            }}
                            eventHandlers={{
                                click: () => setSelectedSectionId(section.id)
                            }}
                        />
                    ))}
                </MapContainer>
            </div>

            {/* AI HUD Overlay */}
            <div className="absolute top-6 left-6 z-[1000]">
                <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-700/50 shadow-2xl max-w-xs animate-in slide-in-from-top-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <h2 className="text-white font-black text-sm uppercase tracking-widest">Crowd AI Sentinel</h2>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        Select a sector on the map, then upload a real-time photo. Our Gemini AI will verify density before broadcast.
                    </p>
                </div>
            </div>

            {/* Reporting Modal */}
            {selectedSectionId && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-md">
                    <div className="bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10 ring-1 ring-white/5 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{currentSection?.name}</h3>
                                <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Verification Required</p>
                            </div>
                            <button
                                onClick={() => { setSelectedSectionId(null); setImage(null); setDetectedLevel(null); }}
                                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
                            >
                                ✕
                            </button>
                        </div>

                        {!image ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-700 hover:border-blue-500 transition-all flex flex-col items-center justify-center cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <span className="text-white font-bold">Snap or Upload</span>
                                <span className="text-slate-500 text-[10px] uppercase font-bold mt-1 tracking-widest">Real-time Proof</span>
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
                            <div className="space-y-6">
                                <div className="relative aspect-video rounded-3xl overflow-hidden ring-4 ring-white/10">
                                    <img src={image} className="w-full h-full object-cover" />
                                    {analyzing && (
                                        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            <span className="text-white font-black text-xs uppercase tracking-widest">AI Scanning...</span>
                                        </div>
                                    )}
                                </div>

                                {detectedLevel && !analyzing && (
                                    <div className="animate-in fade-in slide-in-from-bottom-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">AI Result</span>
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${detectedLevel === 1 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                    detectedLevel === 2 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {crowdLevels[detectedLevel].label} Density
                                            </span>
                                        </div>

                                        <button
                                            onClick={submitReport}
                                            disabled={success}
                                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${success
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/30'
                                                }`}
                                        >
                                            {success ? '✓ Broadcasted Successfully' : 'Confirm & Broadcast'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Back Button */}
            <a href="/volunteer" className="absolute top-6 right-6 z-[1000] bg-slate-900/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                ← Exit Sentinel
            </a>
        </div>
    );
}

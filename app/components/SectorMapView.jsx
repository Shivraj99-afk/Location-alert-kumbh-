"use client";

import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ----------------------
// DATA: Refined Main Polygon (Clockwise)
// Matches the "red shape" from the area
// ----------------------
const mainPolygonPoints = [
    [20.0090101, 73.7918293], // NW
    [20.0091008, 73.7926876], // NE
    [20.0085564, 73.7930417], // Mid-East
    [20.0081633, 73.7928485], // SE
    [20.0080927, 73.7920546], // SW
    [20.0086472, 73.7917971]  // Mid-West
];

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
    null: { color: "#3b82f6", label: "No Data", fillColor: "#3b82f6" },
    1: { color: "#22c55e", label: "Low", fillColor: "#22c55e" },
    2: { color: "#eab308", label: "Medium", fillColor: "#eab308" },
    3: { color: "#ef4444", label: "Heavy", fillColor: "#ef4444" }
};

export default function SectorMapView() {
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [sectionCrowd, setSectionCrowd] = useState({});
    const [image, setImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [detectedLevel, setDetectedLevel] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

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

    const gridSections = useMemo(() => generateGridSections(mainPolygonPoints, 5, 5), []);

    // Sync shared data every 3 seconds
    useEffect(() => {
        const syncData = async () => {
            try {
                const res = await fetch("/api/crowd/update");
                const data = await res.json();
                setSectionCrowd(data);
            } catch (err) {
                console.error("Sync error:", err);
            }
        };

        syncData();
        const id = setInterval(syncData, 3000);
        return () => clearInterval(id);
    }, []);

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
                    sectionId: selectedSectionId,
                    level: detectedLevel,
                    timestamp: Date.now()
                })
            });
            if (res.ok) {
                setSuccess(true);
                setSectionCrowd(prev => ({ ...prev, [selectedSectionId]: detectedLevel }));
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
            <MapContainer
                center={[20.0086, 73.7924]}
                zoom={18}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <Polygon
                    positions={mainPolygonPoints}
                    pathOptions={{ color: "red", weight: 3, fillOpacity: 0.05, dashArray: "5, 5" }}
                />

                {gridSections.map((section) => {
                    const crowdLevel = sectionCrowd[section.id];
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
                                fillOpacity: isSelected ? 0.7 : 0.45,
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    handleSectionClick(section.id);
                                },
                            }}
                        />
                    );
                })}
            </MapContainer>

            {selectedSectionId && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[1000] bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100 w-[90%] max-w-[380px] animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-none">{currentSection?.name}</h3>
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
                                            {crowdLevels[detectedLevel].label} Density
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

            {!selectedSectionId && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-6 py-3 rounded-full shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <p className="text-sm font-bold text-gray-800">Tap a sector to start AI verification</p>
                </div>
            )}

            <a href="/location" className="absolute top-6 right-6 z-[1000] bg-white p-3 rounded-full shadow-lg border border-gray-100 font-bold text-blue-600 hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </a>
        </div>
    );
}

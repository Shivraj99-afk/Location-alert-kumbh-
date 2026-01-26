"use client";

import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import { useState, useMemo, useEffect } from "react";
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
    };

    const handleCrowdUpdate = async (level) => {
        if (selectedSectionId) {
            setSectionCrowd(prev => ({ ...prev, [selectedSectionId]: level }));

            // Call API
            try {
                await fetch("/api/crowd/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sectionId: selectedSectionId,
                        level: level,
                        timestamp: Date.now()
                    })
                });
            } catch (err) {
                console.error("Failed to update crowd:", err);
            }
        }
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
                                color: isSelected ? "yellow" : "white",
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
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[1000] bg-white p-6 rounded-2xl shadow-2xl border border-gray-200 w-[340px]">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-extrabold text-gray-900">{currentSection?.name}</h3>
                            <p className="text-xs text-gray-500">Ramkund Bathing Ghat Area</p>
                        </div>
                        <button
                            onClick={() => setSelectedSectionId(null)}
                            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-black"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-gray-700">How&apos;s the crowd here?</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3].map(level => (
                                <button
                                    key={level}
                                    onClick={() => handleCrowdUpdate(level)}
                                    className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${sectionCrowd[selectedSectionId] === level
                                        ? `border-gray-900 ${level === 1 ? 'bg-green-500' : level === 2 ? 'bg-yellow-400' : 'bg-red-500'} text-white`
                                        : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <span className="text-sm font-bold">{crowdLevels[level].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!selectedSectionId && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-6 py-3 rounded-full shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <p className="text-sm font-bold text-gray-800">Tap a square to report density</p>
                </div>
            )}

            <a href="/location" className="absolute top-6 right-6 z-[1000] bg-white p-3 rounded-full shadow-lg border border-gray-100 font-bold text-blue-600">
                Go to GPS Tracker →
            </a>
        </div>
    );
}

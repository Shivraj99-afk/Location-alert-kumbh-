"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";

import { LAT_STEP, LNG_STEP } from "@/lib/grid";

// Dynamic imports for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import("react-leaflet").then((m) => m.ZoomControl),
  { ssr: false }
);

export default function LocationPage() {
  const [userId] = useState(() => `u-${uuid().slice(0, 8)}`);
  const [position, setPosition] = useState({ lat: 19.9975, lng: 73.7898 }); // Default: Nashik
  const [accuracy, setAccuracy] = useState(null);
  const [isGpsActive, setIsGpsActive] = useState(false);

  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [currentCellId, setCurrentCellId] = useState(null);
  const [rankInCell, setRankInCell] = useState(1);
  const [crowdLimit, setCrowdLimit] = useState(5);
  const [isAlertActive, setIsAlertActive] = useState(false);

  const [navigationPath, setNavigationPath] = useState(null);
  const [recommendedCell, setRecommendedCell] = useState(null);
  const [manualTarget, setManualTarget] = useState(null);
  const [isAutoRouting, setIsAutoRouting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const mapRef = useRef(null);
  const positionRef = useRef(position);
  const isFirstLoad = useRef(true);

  // Initialize Leaflet Icons
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

  // GPS Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };

        setAccuracy(accuracy);
        setIsGpsActive(true);

        // Only update state if precision is good enough or it's the first fix
        if (accuracy < 100 || isFirstLoad.current) {
          setPosition(newPos);
          positionRef.current = newPos;

          if (isFirstLoad.current && mapRef.current) {
            mapRef.current.setView([latitude, longitude], 18);
            isFirstLoad.current = false;
          }
        }
      },
      (err) => {
        console.error("GPS Access Denied:", err);
        setIsGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Backend Synchronization
  const syncWithBackend = useCallback(async () => {
    const currentPos = positionRef.current;
    if (!currentPos) return;

    setIsLoading(true);
    try {
      // 1. Update Position
      await fetch("/api/location/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...currentPos }),
      });

      // 2. Fetch Nearby & Routing Info
      const params = new URLSearchParams({
        userId,
        lat: currentPos.lat.toString(),
        lng: currentPos.lng.toString(),
        autoRoute: isAutoRouting.toString(),
        ...(manualTarget && {
          targetLat: manualTarget.lat.toString(),
          targetLng: manualTarget.lng.toString()
        })
      });

      const res = await fetch(`/api/location/nearby?${params}`);
      const data = await res.json();

      if (data) {
        setNearbyUsers(data.nearby || []);
        setGridData(data.gridCrowd || []);
        setCurrentCellId(data.myCell);
        setRankInCell(data.myRank || 1);
        setIsAlertActive(data.alert || false);
        setRecommendedCell(data.recommendation || null);
        setCrowdLimit(data.crowdLimit || 5);
        setNavigationPath(data.safestPath || null);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error("Sync Failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAutoRouting, manualTarget]);

  // Periodic Sync
  useEffect(() => {
    const interval = setInterval(syncWithBackend, 5000);
    syncWithBackend(); // Initial sync
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  const handleCellClick = (cell) => {
    const target = {
      lat: cell.lat + LAT_STEP / 2,
      lng: cell.lng + LNG_STEP / 2,
      id: cell.id
    };
    setManualTarget(target);
    setIsAutoRouting(true);
  };

  const clearTarget = () => {
    setManualTarget(null);
    setIsAutoRouting(false);
    setNavigationPath(null);
  };

  const centerMap = () => {
    if (mapRef.current && position) {
      mapRef.current.flyTo([position.lat, position.lng], 18);
    }
  };

  // UI Components
  return (
    <div className="relative h-screen w-full bg-slate-950 font-sans text-slate-200">
      {/* Top Overlay: Status & Controls */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          {/* Status Bar */}
          <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isGpsActive ? (accuracy < 50 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-red-500'}`} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 leading-none">GPS Engine</p>
                <p className="text-sm font-bold">{isGpsActive ? (accuracy < 50 ? 'High Precision' : 'Low Precision') : 'Searching...'}</p>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-white/10" />

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 leading-none">Crowd Rank</p>
              <p className="text-sm font-bold text-amber-400">#{rankInCell}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setIsAutoRouting(!isAutoRouting)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isAutoRouting ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white text-slate-900'}`}
            >
              <span className="text-lg">🧭</span>
              {isAutoRouting ? 'AUTO-ROUTING' : 'CALCULATE PATH'}
            </button>

            <button
              onClick={centerMap}
              className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-white/10 rounded-xl text-xl shadow-lg hover:bg-slate-800 transition-colors"
            >
              🎯
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Overlay: Alerts & Navigation */}
      <div className="absolute bottom-6 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          {/* Rerouting Alert */}
          {(manualTarget || recommendedCell) && (
            <div className="bg-blue-600 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(37,99,235,0.4)] border border-blue-400/30 animate-in slide-in-from-bottom-10 pointer-events-auto text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg uppercase tracking-tight leading-none">
                    {manualTarget ? 'Following Manual Path' : 'Suggested Relocation'}
                  </h3>
                  <p className="text-xs text-blue-100 opacity-80 mt-1">Avoiding high-density crowd pockets</p>
                </div>
                {manualTarget && (
                  <button onClick={clearTarget} className="text-white/60 hover:text-white">✕</button>
                )}
              </div>

              <div className="bg-black/20 rounded-2xl p-3 flex justify-between items-center font-mono text-xs">
                <span className="opacity-60 uppercase">Target Sector</span>
                <span className="bg-white text-blue-600 px-3 py-1 rounded-lg font-black">
                  {manualTarget ? `S-${manualTarget.id}` : (recommendedCell ? `S-${recommendedCell.id}` : '...')}
                </span>
              </div>
            </div>
          )}

          {/* Crowded Warning */}
          {isAlertActive && !manualTarget && !recommendedCell && (
            <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-xl animate-bounce text-center font-black uppercase tracking-widest text-sm border-2 border-rose-400 pointer-events-auto">
              ⚠️ HIGH DENSITY SECTOR ({crowdLimit}+ People)
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={18}
        className="h-full w-full grayscale-[0.2]"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />

        {/* Grid Cells */}
        {gridData.map((cell) => {
          const isMe = cell.id === currentCellId;
          const isTarget = manualTarget?.id === cell.id;
          const isRec = recommendedCell?.id === cell.id;

          let color = "#10b981"; // Safe
          if (cell.count >= crowdLimit) color = "#ef4444"; // Crowded
          else if (cell.count > 0) color = "#f59e0b"; // Warning

          if (isTarget || isRec) color = "#3b82f6"; // Navigation

          return (
            <Polygon
              key={cell.id}
              positions={[
                [cell.lat, cell.lng],
                [cell.lat + LAT_STEP, cell.lng],
                [cell.lat + LAT_STEP, cell.lng + LNG_STEP],
                [cell.lat, cell.lng + LNG_STEP],
              ]}
              pathOptions={{
                color: isTarget || isRec ? "#3b82f6" : "rgba(255,255,255,0.2)",
                fillColor: color,
                fillOpacity: isMe ? 0.4 : (cell.count > 0 ? 0.3 : 0.05),
                weight: isMe || isTarget || isRec ? 3 : 0.5,
              }}
              eventHandlers={{
                click: () => handleCellClick(cell)
              }}
            >
              {(isMe || isTarget || isRec || cell.count > 0) && (
                <Tooltip permanent direction="center" className="custom-tooltip">
                  <div className="text-[10px] font-black text-white text-shadow-lg">
                    {isMe ? 'YOU' : (isTarget ? 'GOAL' : (isRec ? 'SUGGEST' : `👥${cell.count}`))}
                  </div>
                </Tooltip>
              )}
            </Polygon>
          )
        })}

        {/* Nearby Users */}
        {nearbyUsers.map(user => (
          <Circle
            key={user.id}
            center={[user.lat, user.lng]}
            radius={2}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
          />
        ))}

        {/* Navigation Route */}
        {navigationPath && (
          <>
            <Polyline
              positions={navigationPath}
              pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.4, lineCap: "round" }}
            />
            <Polyline
              positions={navigationPath}
              pathOptions={{ color: "#ffffff", weight: 2, dashArray: "1, 10", opacity: 0.8 }}
            />
          </>
        )}

        {/* User Marker */}
        <Circle
          center={[position.lat, position.lng]}
          radius={5}
          pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 3 }}
        />

        {/* Pulsing Radius */}
        <Circle
          center={[position.lat, position.lng]}
          radius={50}
          pathOptions={{ color: isAlertActive ? "#f43f5e" : "#10b981", weight: 1, fillOpacity: 0.05, dashArray: "5, 5" }}
        />
      </MapContainer>

      <style jsx global>{`
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .text-shadow-lg {
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .leaflet-container {
          background: #020617 !important;
        }
        @keyframes slide-in-from-bottom-10 {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-bottom-10 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
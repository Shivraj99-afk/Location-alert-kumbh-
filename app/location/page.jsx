"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";

import { LAT_STEP, LNG_STEP } from "@/lib/grid";

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

export default function LocationPage() {
  const [userId] = useState(() => `u-${uuid().slice(0, 8)}`);
  const [position, setPosition] = useState({ lat: 19.9975, lng: 73.7898 });
  const [accuracy, setAccuracy] = useState(null);
  const [isGpsActive, setIsGpsActive] = useState(false);

  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [currentCellId, setCurrentCellId] = useState(null);
  const [rankInCell, setRankInCell] = useState(1);
  const [crowdLimit, setCrowdLimit] = useState(1);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [isSectorCrowded, setIsSectorCrowded] = useState(false);

  const [navigationPath, setNavigationPath] = useState(null);
  const [recommendedCell, setRecommendedCell] = useState(null);
  const [manualTarget, setManualTarget] = useState(null);
  const [isAutoRouting, setIsAutoRouting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef(null);
  const positionRef = useRef(position);
  const isFirstFix = useRef(true);

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

  // Real GPS Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setAccuracy(acc);
        setIsGpsActive(true);

        if (acc < 500) {
          const newPos = { lat: latitude, lng: longitude };
          setPosition(newPos);
          positionRef.current = newPos;

          if (isFirstFix.current && mapRef.current) {
            mapRef.current.setView([latitude, longitude], 18);
            isFirstFix.current = false;
          }
        }
      },
      (err) => setIsGpsActive(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Backend Sync
  const sync = useCallback(async () => {
    const cur = positionRef.current;
    if (!cur) return;
    setIsLoading(true);
    try {
      await fetch("/api/location/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...cur }),
      });

      const params = new URLSearchParams({
        userId,
        lat: cur.lat.toString(),
        lng: cur.lng.toString(),
        autoRoute: isAutoRouting.toString(),
        ...(manualTarget && { targetLat: manualTarget.lat.toString(), targetLng: manualTarget.lng.toString() })
      });

      const res = await fetch(`/api/location/nearby?${params}`);
      const data = await res.json();

      if (data) {
        setNearbyUsers(data.nearby || []);
        setGridData(data.gridCrowd || []);
        setCurrentCellId(data.myCell);
        setRankInCell(data.myRank || 1);
        setIsAlertActive(data.alert || false);
        setIsSectorCrowded(data.isCrowded || false);
        setRecommendedCell(data.recommendation || null);
        setCrowdLimit(data.crowdLimit || 1);
        setNavigationPath(data.safestPath || null);
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAutoRouting, manualTarget]);

  useEffect(() => {
    const id = setInterval(sync, 4000);
    sync();
    return () => clearInterval(id);
  }, [sync]);

  const handleCellClick = (cell) => {
    const target = {
      lat: cell.lat + LAT_STEP / 2,
      lng: cell.lng + LNG_STEP / 2,
      id: cell.id
    };
    setManualTarget(target);
    setIsAutoRouting(true);
  };

  return (
    <div className="relative h-screen w-full bg-[#050810] overflow-hidden text-slate-100 font-sans">
      {/* HUD: Top */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className={`w-3.5 h-3.5 rounded-full ${isGpsActive ? (accuracy < 30 ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-amber-400') : 'bg-rose-500 animate-pulse'}`} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Live Telemetry</p>
                <h2 className="text-sm font-bold tracking-tight uppercase">
                  {isGpsActive ? (accuracy < 30 ? 'Precision Active' : 'Basic Fix') : 'Satellite Sync...'}
                </h2>
              </div>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Safe Capacity</p>
              <h2 className={`text-sm font-black ${isSectorCrowded ? 'text-rose-400' : 'text-emerald-400 text-shadow-glow'}`}>
                {isSectorCrowded ? 'LIMIT EXCEEDED' : 'SECTOR CLEAR'}
              </h2>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setIsAutoRouting(!isAutoRouting)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${isAutoRouting ? 'bg-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 backdrop-blur-xl border border-white/10 text-white'}`}
            >
              🧭 {isAutoRouting ? 'Stop Navigation' : 'Start Safest Path'}
            </button>
            <button onClick={() => mapRef.current?.flyTo([position.lat, position.lng], 18)} className="w-14 h-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-xl shadow-xl hover:bg-white/10 transition-all">🎯</button>
          </div>
        </div>
      </div>

      {/* Dynamic Alerts */}
      <div className="absolute bottom-10 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-md mx-auto space-y-4">
          {(isAlertActive || manualTarget) && (
            <div className={`p-6 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border transition-all animate-in slide-in-from-bottom-10 pointer-events-auto ${manualTarget ? 'bg-slate-900/90 border-white/10' : 'bg-blue-600 border-blue-400/30'}`}>
              <div className="flex items-center gap-5 mb-5">
                <div className={`${manualTarget ? 'bg-blue-500/20' : 'bg-white/20'} p-4 rounded-3xl`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg uppercase tracking-tight leading-none text-white">
                    {manualTarget ? 'User Destination' : 'Safe Re-Route'}
                  </h3>
                  <p className="text-[11px] opacity-70 mt-1.5 font-bold uppercase tracking-wider text-white">
                    {manualTarget ? 'Manually navigating to zone' : 'Automated crowd avoidance active'}
                  </p>
                </div>
                {manualTarget && (
                  <button onClick={() => { setManualTarget(null); setNavigationPath(null); }} className="text-white/40 hover:text-white text-xl">✕</button>
                )}
              </div>

              <div className="bg-black/20 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">Target Zone</span>
                <span className="bg-white text-slate-900 px-4 py-1.5 rounded-xl font-black text-xs">
                  {manualTarget ? manualTarget.id : (recommendedCell ? recommendedCell.id : '...')}
                </span>
              </div>
            </div>
          )}

          {!isAlertActive && isSectorCrowded && (
            <div className="bg-rose-600/90 backdrop-blur-xl text-white py-4 px-8 rounded-3xl text-center font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl border border-rose-400/20 pointer-events-auto animate-pulse">
              Danger: High Crowd Density detected
            </div>
          )}
        </div>
      </div>

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={18}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />

        {/* Directly visible Sections/Zones */}
        {gridData.map((cell) => {
          const isMe = cell.id === currentCellId;
          const isTgt = manualTarget?.id === cell.id;
          const isRec = recommendedCell?.id === cell.id;

          // Strict Green/Red logic as requested
          const isCrowded = cell.count > crowdLimit;
          const color = isCrowded ? "#ef4444" : "#22c55e"; // Red : Green

          // Navigation highlights
          const strokeColor = isTgt || isRec ? "#3b82f6" : "rgba(255,255,255,0.2)";
          const strokeWeight = isMe || isTgt || isRec ? 4 : 1;

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
                color: strokeColor,
                fillColor: color,
                fillOpacity: isMe ? 0.4 : (cell.count > 0 ? 0.3 : 0.15), // Visible even if empty
                weight: strokeWeight,
              }}
              eventHandlers={{ click: () => handleCellClick(cell) }}
            >
              <Tooltip permanent={isMe || isTgt || isRec || cell.count > 0} direction="center" className="clean-tooltip">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] opacity-70 font-black mb-0.5">ZONE</span>
                  <span className="text-[10px] font-black text-white text-shadow leading-none">
                    {isMe ? 'YOU' : (isTgt ? 'TARGET' : (isRec ? 'SUGGEST' : `${cell.count} PERS`))}
                  </span>
                </div>
              </Tooltip>
            </Polygon>
          )
        })}

        {/* Nearby Detected Users */}
        {nearbyUsers.map(u => (
          <Circle
            key={u.id}
            center={[u.lat, u.lng]}
            radius={2}
            pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 1.5 }}
          />
        ))}

        {/* Route Visualization */}
        {navigationPath && (
          <>
            <Polyline positions={navigationPath} pathOptions={{ color: "#3b82f6", weight: 8, opacity: 0.3, lineCap: "round" }} />
            <Polyline positions={navigationPath} pathOptions={{ color: "#ffffff", weight: 2, dashArray: "1, 12", opacity: 0.8 }} />
          </>
        )}

        {/* Self Marker */}
        <Circle center={[position.lat, position.lng]} radius={4.5} pathOptions={{ color: "#fff", fillColor: "#3b82f6", fillOpacity: 1, weight: 4 }} />

        {/* Dynamic Scan radius */}
        <Circle
          center={[position.lat, position.lng]}
          radius={50}
          pathOptions={{
            color: isSectorCrowded ? "#f43f5e" : "#22c55e",
            weight: 2,
            fillOpacity: 0.05,
            dashArray: "10, 10"
          }}
        />
      </MapContainer>

      <style jsx global>{`
        .clean-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .text-shadow { text-shadow: 0 1px 6px rgba(0,0,0,0.9); }
        .text-shadow-glow { text-shadow: 0 0 8px rgba(74, 222, 128, 0.5); }
        .leaflet-container { background: #050810 !important; }
        .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%); }
        @keyframes slide-in-from-bottom-10 { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: slide-in-from-bottom-10 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
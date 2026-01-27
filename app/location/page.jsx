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
  const [position, setPosition] = useState(null); // Wait for GPS
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
  const positionRef = useRef(null);
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

  const clearTarget = () => {
    setManualTarget(null);
    setNavigationPath(null);
  };

  if (!position) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-blue-400 font-mono">WAITING FOR GPS FIXED...</div>;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
      {/* Simulation Header Style */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse pointer-events-auto ${isGpsActive ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {isGpsActive ? 'Live Location Active' : 'GPS Offline'}
          </div>
          <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white font-mono text-xs pointer-events-auto shadow-2xl">
            <p className="text-blue-400 font-bold mb-1 underline">LOCATION HUD</p>
            <p>RANK: <span className="text-yellow-400 font-bold">#{rankInCell}</span></p>
            <p>LIMIT: <span className="text-white font-bold">{crowdLimit} PER CELL</span></p>
            {isLoading && <p className="text-green-400 mt-1">⟳ Syncing...</p>}
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsAutoRouting(!isAutoRouting)}
            className={`flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl ${isAutoRouting ? 'bg-red-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            {isAutoRouting ? '🧭 AUTO RE-ROUTE: ON' : '🧭 TRIGGER SAFE PATH'}
          </button>
          <button onClick={() => mapRef.current?.flyTo([position.lat, position.lng], 18)} className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-xl shadow-xl hover:bg-white/20 transition-all">🎯</button>
          {manualTarget && (
            <button
              onClick={clearTarget}
              className="w-12 h-12 bg-zinc-800 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-zinc-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Rerouting Overlay Style */}
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
                {manualTarget ? `CELL ${manualTarget.id}` : `AUTO SAFE ZONE`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Low Alert (Sim-Tracker Style) */}
      {!isAlertActive && isSectorCrowded && !manualTarget && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-[1000] w-[80%] pointer-events-none">
          <div className="bg-rose-600/90 text-white py-2 px-4 rounded-xl text-center font-bold text-[10px] uppercase tracking-widest shadow-2xl animate-pulse">
            ⚠️ Danger: Crowd Threshold Reached
          </div>
        </div>
      )}

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={18}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Sections in nearby area */}
        {gridData.map((cell) => {
          const isMe = cell.id === currentCellId;
          const isTgt = manualTarget?.id === cell.id;
          const isRec = recommendedCell?.id === cell.id;

          const isCrowded = cell.count > crowdLimit;
          const color = isCrowded ? "#ef4444" : "#10b981"; // Red : Green

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
                color: isRec || isTgt ? "#3b82f6" : "white",
                fillColor: color,
                fillOpacity: isMe ? 0.6 : (isCrowded ? 0.5 : 0.35),
                weight: isMe || isRec || isTgt ? 3 : 0.5,
              }}
              eventHandlers={{ click: () => handleCellClick(cell) }}
            >
              <Tooltip permanent={isMe || isRec || isTgt} direction="center" className="sim-tooltip">
                <div className="text-[9px] font-black text-white text-shadow">
                  {isMe ? 'YOU' : (isTgt ? 'TARGET' : (isRec ? 'RECO' : `SEC ${cell.id}`))}
                  <br />👥 {cell.count}
                </div>
              </Tooltip>
            </Polygon>
          )
        })}

        {/* Nearby Users */}
        {nearbyUsers.map(u => (
          <Circle
            key={u.id}
            center={[u.lat, u.lng]}
            radius={2.5}
            pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.9, weight: 1 }}
          />
        ))}

        {/* Safest AI Route Visualization */}
        {navigationPath && (
          <>
            <Polyline positions={navigationPath} pathOptions={{ color: "#3b82f6", weight: 8, opacity: 0.3, lineCap: "round" }} />
            <Polyline positions={navigationPath} pathOptions={{ color: "#ffffff", weight: 2, dashArray: "1, 12", opacity: 0.8 }} />
          </>
        )}

        <Circle center={[position.lat, position.lng]} radius={4} pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }} />
      </MapContainer>

      <style jsx global>{`
        .sim-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .text-shadow { text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
        .leaflet-container { background: #000 !important; }

        @keyframes slide-in-from-bottom-5 {
            from { transform: translateY(20px) translateX(-50%); opacity: 0; }
            to { transform: translateY(0) translateX(-50%); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-bottom-5 0.3s ease-out; }
      `}</style>
    </div>
  );
}
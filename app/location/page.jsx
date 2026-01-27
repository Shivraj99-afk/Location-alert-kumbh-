"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";

import { LAT_STEP, LNG_STEP } from "@/lib/grid";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
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

export default function LocationPage() {
  const [userId] = useState(uuid());
  const [pos, setPos] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [gridCrowd, setGridCrowd] = useState([]);
  const [myCell, setMyCell] = useState(null);
  const [myRank, setMyRank] = useState(1);
  const [alert, setAlert] = useState(false);
  const [navigationPath, setNavigationPath] = useState(null);
  const [recommendedCell, setRecommendedCell] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [crowdLimit, setCrowdLimit] = useState(2);
  const [forceSafePath, setForceSafePath] = useState(false);
  const [manualTarget, setManualTarget] = useState(null);

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

  // Get GPS Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);


  // Sync with Backend
  useEffect(() => {
    if (!pos) return;

    const sync = async () => {
      try {
        // Update my location
        await fetch("/api/location/update", {
          method: "POST",
          body: JSON.stringify({ userId, lat: pos.lat, lng: pos.lng }),
        });

        // Get nearby info 
        const res = await fetch(`/api/location/nearby?userId=${userId}&lat=${pos.lat}&lng=${pos.lng}&forceSafePath=${forceSafePath}`);
        const data = await res.json();

        setNearby(data.nearby || []);
        setGridCrowd(data.gridCrowd || []);
        setMyCell(data.myCell);
        setMyRank(data.myRank || 1);
        setAlert(data.alert);
        setRecommendedCell(data.recommendation);
        setCrowdLimit(data.crowdLimit);
        setLastSync(new Date());
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    sync();
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, [pos, userId, forceSafePath]);

  // Update Global Limit
  const handleLimitChange = async (newLimit) => {
    try {
      await fetch("/api/location/settings", {
        method: "POST",
        body: JSON.stringify({ limit: parseInt(newLimit) }),
      });
      setCrowdLimit(newLimit);
    } catch (err) {
      console.error("Settings error:", err);
    }
  };

  // Rerouting Logic is now handled by the API (recommendedCell comes from sync)

  useEffect(() => {
    const target = manualTarget || recommendedCell;
    if (!pos || !target) {
      setNavigationPath(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        let destLat, destLng;
        if (manualTarget) {
          destLat = manualTarget.lat;
          destLng = manualTarget.lng;
        } else if (recommendedCell) {
          destLat = recommendedCell.lat + LAT_STEP / 2;
          destLng = recommendedCell.lng + LNG_STEP / 2;
        } else {
          return;
        }

        const url = `https://router.project-osrm.org/route/v1/walking/${pos.lng},${pos.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const path = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setNavigationPath(path);
        }
      } catch (err) {
        console.error("Routing error:", err);
      }
    };
    fetchRoute();
  }, [recommendedCell?.id, manualTarget?.lat, manualTarget?.lng]); // Only re-fetch if destination point changes

  if (!pos) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">INITIALIZING MICRO-SENSORS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Dynamic Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <a href="/lost/feed" className="bg-white/90 backdrop-blur-md text-blue-600 px-4 py-2 rounded-xl border border-blue-100 shadow-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-white transition-all">
            📢 <span className="hidden sm:inline">LOST & FOUND</span>
          </a>
          <a href="/volunteer" className="bg-white/90 backdrop-blur-md text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 shadow-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-white transition-all">
            🤝 <span className="hidden sm:inline">VOLUNTEER</span>
          </a>
          <button
            onClick={() => {
              setForceSafePath(!forceSafePath);
              if (!forceSafePath) setManualTarget(null); // Clear manual if turning on auto
            }}
            className={`bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border shadow-lg font-bold text-sm tracking-tight flex items-center gap-2 transition-all pointer-events-auto ${forceSafePath ? 'text-red-600 border-red-100 ring-2 ring-red-500/20' : 'text-slate-800 border-slate-100 hover:bg-white'}`}>
            🧭 {forceSafePath ? 'MANUAL NAVIGATION: ON' : 'GET SAFE PATH'}
          </button>
          {manualTarget && (
            <button
              onClick={() => setManualTarget(null)}
              className="bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg font-bold text-xs tracking-tight animate-in slide-in-from-left-5 pointer-events-auto"
            >
              ✕ CLEAR SELECTION
            </button>
          )}
        </div>

        <div className="bg-black/80 backdrop-blur-md text-green-400 p-4 rounded-2xl border border-green-500/30 shadow-2xl font-mono text-[10px] sm:text-xs pointer-events-auto min-w-[160px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-bold">MICRO-HUD</span>
            </div>
            <span className="opacity-50 text-[8px]">{lastSync.toLocaleTimeString([], { second: '2-digit' })}s</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="opacity-60 text-[9px] uppercase tracking-tighter">LIMIT / CELL</span>
              <input
                type="number"
                min="1"
                max="10"
                value={crowdLimit}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="bg-green-500/20 text-green-400 w-8 text-center rounded border border-green-500/30 font-bold focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            </div>
            <div className="flex justify-between items-center opacity-80 border-t border-white/5 pt-1">
              <span>RANK</span>
              <span className="text-yellow-400 font-bold underline">#{myRank}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rerouting Alert Overlay */}
      {(recommendedCell || manualTarget) && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md pointer-events-none">
          <div className="bg-blue-600/95 backdrop-blur-xl text-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-blue-400/30 animate-in slide-in-from-bottom-10 pointer-events-auto">
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-white/20 p-3 rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg leading-tight uppercase tracking-tighter">
                  {manualTarget ? 'Manual Target Set' : (forceSafePath ? 'Optimized Route Found' : 'Heavy Crowd Detected')}
                </h3>
                <p className="text-blue-100 text-sm opacity-80 font-medium">
                  {manualTarget ? 'Following your selected zone' : 'Load-balanced path established'}
                </p>
              </div>
              {manualTarget && (
                <button onClick={() => setManualTarget(null)} className="text-blue-200 hover:text-white transition-colors">✕</button>
              )}
            </div>
            <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60 text-white">Target sector</span>
              <span class="font-mono bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-black">
                SECTOR {manualTarget
                  ? String.fromCharCode(64 + gridCrowd.findIndex(c => c.id === manualTarget.cellId) + 1)
                  : String.fromCharCode(64 + gridCrowd.indexOf(recommendedCell) + 1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Critical Alert Banner */}
      {alert && !recommendedCell && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] pointer-events-none">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-center animate-bounce border-2 border-red-400 pointer-events-auto uppercase tracking-tighter">
            ⚠️ Alert: Sector Limit Exceeded ({crowdLimit}+)
          </div>
        </div>
      )}

      <MapContainer
        center={[pos.lat, pos.lng]}
        zoom={18}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Dynamic Grid Rendering */}
        {gridCrowd.map((cell, idx) => {
          const isMe = cell.id === myCell;
          const isRecommended = recommendedCell && cell.id === recommendedCell.id;
          const isSelected = manualTarget && cell.id === manualTarget.cellId;
          const opacity = isMe ? 0.6 : 0.3;
          let color = "#10b981"; // Green (Safe)
          if (cell.count >= crowdLimit) color = "#ef4444"; // Red (High)
          else if (cell.count > 0) color = "#f59e0b"; // Orange (Med)

          if (isRecommended) color = "#3b82f6"; // Blue (Recommended)

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
                color: isSelected ? "#3b82f6" : (isRecommended ? "#3b82f6" : "white"),
                fillColor: color,
                fillOpacity: opacity,
                weight: isMe || isRecommended || isSelected ? 4 : 1,
              }}
              eventHandlers={{
                click: (e) => {
                  setManualTarget({
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    cellId: cell.id
                  });
                  setForceSafePath(true);
                }
              }}
            >
              <Tooltip permanent={isMe || isRecommended || isSelected} direction="center" className="grid-tooltip">
                <div className="text-center font-bold text-[10px]">
                  {isMe ? "YOU" : (isSelected ? "TARGET" : `SEC ${String.fromCharCode(65 + idx)}`)}
                  <br />
                  <span className="opacity-70">👥 {cell.count}</span>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Nearby Users */}
        {nearby.map((u) => (
          <Circle
            key={u.id}
            center={[u.lat, u.lng]}
            radius={2}
            pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.8 }}
          />
        ))}

        {/* Navigation Route */}
        {navigationPath && (
          <>
            <Polyline
              positions={navigationPath}
              pathOptions={{ color: "#3b82f6", weight: 8, opacity: 0.4, lineCap: "round" }}
            />
            <Polyline
              positions={navigationPath}
              pathOptions={{ color: "#ffffff", weight: 2, dashArray: "5, 15", opacity: 1 }}
            />
          </>
        )}

        {/* Off-Road Guidance Line (Direct Path to Precise Point) */}
        {(manualTarget || recommendedCell) && (
          <Polyline
            positions={[
              [pos.lat, pos.lng],
              [
                manualTarget ? manualTarget.lat : recommendedCell.lat + LAT_STEP / 2,
                manualTarget ? manualTarget.lng : recommendedCell.lng + LNG_STEP / 2
              ]
            ]}
            pathOptions={{ color: "#3b82f6", weight: 2, dashArray: "10, 20", opacity: 0.8 }}
          />
        )}

        {/* Current User Dot */}
        <Circle
          center={[pos.lat, pos.lng]}
          radius={5}
          pathOptions={{ color: "#ffffff", fillColor: "#3b82f6", fillOpacity: 1, weight: 3 }}
        />
        <Circle
          center={[pos.lat, pos.lng]}
          radius={50}
          pathOptions={{ color: alert ? "#ef4444" : "#10b981", weight: 1, fillOpacity: 0.05, dashArray: "5, 5" }}
        />
      </MapContainer>

      <style jsx global>{`
        .grid-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white !important;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8);
          font-family: inherit;
        }
        .leaflet-container {
          background: #111827 !important;
        }
      `}</style>
    </div>
  );
}

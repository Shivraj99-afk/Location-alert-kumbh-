"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { v4 as uuid } from "uuid";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase"; // Using Supabase for WebSockets

import { LAT_STEP, LNG_STEP, getSafestPath, getCellId } from "@/lib/grid";

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

export default function LocationPage() {
  const [userId] = useState(() => `u-${uuid().slice(0, 16)}`); // Longer ID to prevent collisions
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isGpsActive, setIsGpsActive] = useState(false);

  // Real-time peer data from WebSockets (Supabase Presence)
  const [peers, setPeers] = useState({});
  const [crowdLimit] = useState(1); // Setting crowd limit locally for client-side logic

  // Pathfinding & Alerts
  const [navigationPath, setNavigationPath] = useState(null);
  const [manualTarget, setManualTarget] = useState(null);
  const [isAutoRouting, setIsAutoRouting] = useState(false);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [joinTime] = useState(() => Date.now());

  const mapRef = useRef(null);
  const positionRef = useRef(null);
  const isFirstFix = useRef(true);
  const channelRef = useRef(null);

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

  // 1. SETUP WEBSOCKET (Supabase Presence)
  useEffect(() => {
    const channel = supabase.channel('crowd-swarm', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const formattedPeers = {};

        Object.keys(state).forEach(key => {
          if (key !== userId) {
            // Take the latest state for this user ID
            formattedPeers[key] = state[key][state[key].length - 1];
          }
        });
        setPeers(formattedPeers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle new arrivals alert logic here if needed
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // 2. REAL GPS TRACKING & BROADCAST
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

          // Broadcast my current GPS via WebSocket
          if (channelRef.current) {
            channelRef.current.track({
              lat: latitude,
              lng: longitude,
              joinTime: joinTime,
              userId: userId
            });
          }

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
  }, [joinTime, userId]);

  // 3. CALCULATE GRID & CROWD (Client-side real-time aggregation)
  const gridData = useMemo(() => {
    if (!position) return [];

    const density = {};
    const myCell = getCellId(position.lat, position.lng);

    // Add peers to density map
    Object.values(peers).forEach(p => {
      const cid = getCellId(p.lat, p.lng);
      density[cid] = (density[cid] || 0) + 1;
    });

    // Generate local grid snippet for rendering
    const rBase = Math.floor(position.lat / LAT_STEP);
    const cBase = Math.floor(position.lng / LNG_STEP);
    const grid = [];

    for (let dr = -6; dr <= 6; dr++) {
      for (let dc = -6; dc <= 6; dc++) {
        const r = rBase + dr;
        const c = cBase + dc;
        const id = `${r},${c}`;
        grid.push({
          id,
          lat: r * LAT_STEP,
          lng: c * LNG_STEP,
          count: density[id] || 0,
          isMe: id === myCell
        });
      }
    }
    return grid;
  }, [position, peers]);

  const currentCellStatus = useMemo(() => {
    if (!position) return { rank: 1, isCrowded: false };
    const myCell = getCellId(position.lat, position.lng);

    const cellPeers = Object.values(peers)
      .filter(p => getCellId(p.lat, p.lng) === myCell)
      .sort((a, b) => a.joinTime - b.joinTime);

    const rank = cellPeers.filter(p => p.joinTime < joinTime).length + 1;
    const isCrowded = cellPeers.length >= crowdLimit;

    return { rank, isCrowded };
  }, [position, peers, joinTime, crowdLimit]);

  // 4. REAL-TIME PATHFINDING
  useEffect(() => {
    if (!position || (!isAutoRouting && !manualTarget)) {
      setNavigationPath(null);
      setIsAlertActive(false);
      return;
    }

    const myCell = getCellId(position.lat, position.lng);
    const density = {};
    gridData.forEach(c => density[c.id] = c.count);

    // Alert Logic: Only for new arrivals (first 20s) in a crowd
    const isNewArrival = Date.now() - joinTime < 20000;
    const shouldAlert = currentCellStatus.isCrowded && rankInCell > crowdLimit && isNewArrival;

    setIsAlertActive(shouldAlert);

    // Determine target
    let target = null;
    if (manualTarget) {
      target = { lat: manualTarget.lat, lng: manualTarget.lng };
    } else if (isAutoRouting || shouldAlert) {
      // Find nearest empty cell
      const safeCells = gridData
        .filter(c => c.id !== myCell && c.count < crowdLimit)
        .sort((a, b) => {
          const dA = Math.abs(position.lat - a.lat) + Math.abs(position.lng - a.lng);
          const dB = Math.abs(position.lat - b.lat) + Math.abs(position.lng - b.lng);
          return dA - dB;
        });
      if (safeCells.length > 0) {
        target = { lat: safeCells[0].lat + LAT_STEP / 2, lng: safeCells[0].lng + LNG_STEP / 2 };
      }
    }

    if (target) {
      const path = getSafestPath(position, target, density, crowdLimit + 1);
      setNavigationPath(path);
    } else {
      setNavigationPath(null);
    }
  }, [position, gridData, isAutoRouting, manualTarget, currentCellStatus, joinTime, crowdLimit]);

  const rankInCell = currentCellStatus.rank;
  const isSectorCrowded = currentCellStatus.isCrowded;

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

  if (!position) return <div className="h-screen w-full flex items-center justify-center bg-black text-blue-400 font-mono tracking-tighter">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      INITIALIZING WS GPS SWARM...
    </div>
  </div>;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
      {/* Simulation Header Style */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 pointer-events-auto ${isGpsActive ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            {isGpsActive ? 'WS REAL-TIME GPS ACTIVE' : 'SOCKET OFFLINE'}
          </div>
          <div className="bg-black/80 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/10 text-white font-mono text-xs pointer-events-auto shadow-2xl">
            <p className="text-blue-400 font-bold mb-1 underline text-[10px] tracking-widest uppercase">Network Saturation</p>
            <p className="flex justify-between gap-4">RANK: <span className="text-yellow-400 font-black">#{rankInCell}</span></p>
            <p className="flex justify-between gap-4">TOTAL SWARM: <span className="text-emerald-400 font-black">{Object.keys(peers).length + 1}</span></p>
            <p className="flex justify-between gap-4 mt-1 pt-1 border-t border-white/5 opacity-40 text-[9px]">PEERS: <span>{Object.keys(peers).length}</span></p>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsAutoRouting(!isAutoRouting)}
            className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl border ${isAutoRouting ? 'bg-red-500 border-red-400 text-white' : 'bg-white/10 backdrop-blur-md border-white/10 text-white hover:bg-white/20'}`}
          >
            {isAutoRouting ? '🧭 DISABLE AUTO-ROUTE' : '🧭 TRIGGER SAFE PATH'}
          </button>
          <button onClick={() => mapRef.current?.flyTo([position.lat, position.lng], 18)} className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-xl shadow-xl hover:bg-white/20 transition-all">🎯</button>
          {manualTarget && (
            <button
              onClick={clearTarget}
              className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-rose-700 transition-all border border-rose-400/50"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Rerouting Overlay Style */}
      {(navigationPath && (manualTarget || isAutoRouting || isAlertActive)) && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm pointer-events-none">
          <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] border border-blue-400/50 animate-in slide-in-from-bottom-5 pointer-events-auto text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 p-4 rounded-3xl">
                <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">
                  {manualTarget ? 'Following Manual Lock' : 'AI Safety Reroute'}
                </h3>
                <p className="text-[10px] text-blue-100 opacity-70 font-bold uppercase tracking-widest mt-1">
                  {manualTarget ? 'Navigating to selected sector' : 'Dodging high-density clusters'}
                </p>
              </div>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 flex justify-between items-center border border-white/5">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Destination</span>
              <span className="font-mono text-xs font-black bg-white text-blue-600 px-4 py-1.5 rounded-xl shadow-inner">
                {manualTarget ? `S-${manualTarget.id}` : `SAFE_ZONE_42`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Threat Alert */}
      {!isAlertActive && isSectorCrowded && !manualTarget && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-[1000] w-[85%] pointer-events-none">
          <div className="bg-rose-600 text-white py-3 px-6 rounded-2xl text-center font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_15px_30px_rgba(225,29,72,0.4)] border border-rose-400/30 animate-pulse">
            ⚠️ Threat: Capacity Limit Exceeded
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
          const isMe = cell.id === getCellId(position.lat, position.lng);
          const isTgt = manualTarget?.id === cell.id;
          const isRec = !manualTarget && isAutoRouting && navigationPath && navigationPath[navigationPath.length - 1][0] === cell.lat + LAT_STEP / 2;

          const isCrowded = cell.count >= crowdLimit;
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
                color: isTgt || isRec ? "#3b82f6" : "white",
                fillColor: color,
                fillOpacity: isMe ? 0.6 : (cell.count > 0 ? 0.4 : 0.2),
                weight: isMe || isTgt || isRec ? 3 : 0.5,
              }}
              eventHandlers={{ click: () => handleCellClick(cell) }}
            >
              <Tooltip permanent={isMe || isTgt || isRec || cell.count > 0} direction="center" className="sim-tooltip">
                <div className="text-[9px] font-black text-white text-shadow leading-none">
                  {isMe ? 'YOU' : (isTgt ? 'TARGET' : (isRec ? 'RECO' : (cell.count > 0 ? `👥 ${cell.count}` : '')))}
                </div>
              </Tooltip>
            </Polygon>
          )
        })}

        {/* Nearby Peers (Detected via WS) */}
        {Object.keys(peers).map(id => (
          <Circle
            key={id}
            center={[peers[id].lat, peers[id].lng]}
            radius={2.5}
            pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 1.5 }}
          />
        ))}

        {/* Visualization of Calculated Safe Path */}
        {navigationPath && (
          <>
            <Polyline positions={navigationPath} pathOptions={{ color: "#3b82f6", weight: 8, opacity: 0.3, lineCap: "round" }} />
            <Polyline positions={navigationPath} pathOptions={{ color: "#ffffff", weight: 2, dashArray: "1, 12", opacity: 0.8 }} />
          </>
        )}

        {/* Home Dot */}
        <Circle center={[position.lat, position.lng]} radius={4.5} pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 4 }} />
      </MapContainer>

      <style jsx global>{`
        .sim-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .text-shadow { text-shadow: 0 1px 6px rgba(0,0,0,1); }
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
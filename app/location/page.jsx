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
  const [pos, setPos] = useState({ lat: 19.9975, lng: 73.7898 }); // Default to Nashik
  const [hasGPS, setHasGPS] = useState(false);
  const posRef = useState({ current: { lat: 19.9975, lng: 73.7898 } })[0];
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
  const [isLoading, setIsLoading] = useState(false);
  const [family, setFamily] = useState([]);
  const [groupCode, setGroupCode] = useState(null);
  const [groupName, setGroupName] = useState(null);
  const [userName, setUserName] = useState("Pilgrim");
  const [showGroupModal, setShowGroupModal] = useState(false);

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

    // Load family session
    const savedCode = localStorage.getItem("groupId");
    const savedName = localStorage.getItem("userName");
    if (savedCode) setGroupCode(savedCode);
    if (savedName) setUserName(savedName);
  }, []);

  const [accuracy, setAccuracy] = useState(null);

  // Get GPS Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          // If accuracy is > 1000 meters, it's likely IP-based coarse location
          // which can be 20-30km off in India. We should still show it but warn the user.
          setAccuracy(p.coords.accuracy);

          const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };

          // Only update reference for sync if accuracy is reasonable (< 500m)
          // This prevents the "20km jump" bug caused by IP fallbacks
          if (p.coords.accuracy < 500) {
            setPos(newPos);
            setHasGPS(true);
            posRef.current = newPos;
          }
        },
        (err) => {
          console.error("GPS Error:", err);
          setHasGPS(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Force fresh data, no cache
          timeout: 10000  // Wait up to 10s for a fix
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);


  // Sync with Backend
  useEffect(() => {
    if (!pos) return;

    const sync = async () => {
      const currentPos = posRef.current;
      if (!currentPos) return;

      setIsLoading(true);
      try {
        // Update my location
        await fetch("/api/location/update", {
          method: "POST",
          body: JSON.stringify({ userId, lat: currentPos.lat, lng: currentPos.lng }),
        });

        // Get nearby info 
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

        const res = await fetch(`/api/location/nearby?${query.toString()}`);
        const data = await res.json();

        setNearby(data.nearby || []);
        setGridCrowd(data.gridCrowd || []);
        setMyCell(data.myCell);
        setMyRank(data.myRank || 1);
        setAlert(data.alert);
        setRecommendedCell(data.recommendation);
        setCrowdLimit(data.crowdLimit);
        setFamily(data.family || []);
        if (data.safestPath) setNavigationPath(data.safestPath);
        else if (!manualTarget && !data.recommendation) setNavigationPath(null);
        setLastSync(new Date());
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    sync();
  }, [userId, forceSafePath, manualTarget?.lat, manualTarget?.lng]);

  const handleGroupAction = async (action, code, name) => {
    try {
      const res = await fetch("/api/location/group", {
        method: "POST",
        body: JSON.stringify({ action, userId, groupCode: code, groupName: name, userName }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "create" || action === "join") {
          setGroupCode(data.groupCode || code);
          setGroupName(data.groupName || name);
          localStorage.setItem("groupId", data.groupCode || code);
          localStorage.setItem("groupName", data.groupName || name);
          setShowGroupModal(false);
        } else if (action === "leave") {
          setGroupCode(null);
          setGroupName(null);
          localStorage.removeItem("groupId");
          localStorage.removeItem("groupName");
        }
      } else {
        alert(data.error || "Group action failed");
      }
    } catch (err) {
      console.error("Group error:", err);
    }
  };

  // Rerouting Logic is now handled 100% by the API SafestPath (Grid-based, NO ROADS)
  // This ensures we avoid crowds in open fields like Ram Kund.

  const fallbackGrid = useMemo(() => {
    return Array.from({ length: 121 }).map((_, i) => { // 11x11 fallback is enough
      const r = Math.floor(i / 11) - 5;
      const c = (i % 11) - 5;
      const myRLat = Math.floor(pos.lat / LAT_STEP);
      const myRLng = Math.floor(pos.lng / LNG_STEP);
      const rid = (myRLat + r);
      const cid = (myRLng + c);
      return {
        id: `${rid},${cid}`,
        lat: rid * LAT_STEP,
        lng: cid * LNG_STEP,
        count: 0
      };
    });
  }, [Math.floor(pos.lat / LAT_STEP), Math.floor(pos.lng / LNG_STEP)]);

  // No more blocking loading screen - we show the map with a status indicator

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Dynamic Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {!hasGPS && (
            <div className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse mb-1">
              ⌛ Searching for GPS...
            </div>
          )}
          <a href="/lost/feed" className="bg-white text-blue-600 px-4 py-2 rounded-xl border border-blue-100 shadow-lg font-bold text-sm tracking-tight flex items-center gap-2 transition-all">
            📢 <span className="hidden sm:inline">LOST & FOUND</span>
          </a>
          <button
            onClick={() => setShowGroupModal(true)}
            className={`bg-white px-4 py-2 rounded-xl border shadow-lg font-bold text-sm tracking-tight flex items-center gap-2 transition-all pointer-events-auto ${groupCode ? 'text-blue-600 border-blue-100' : 'text-slate-800 border-slate-100'}`}>
            👨‍👩‍👧‍👦 {groupCode ? `FAMILY: ${groupCode}` : 'LINK FAMILY'}
          </button>
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

        <div className="bg-slate-900 border border-white/10 text-green-400 p-4 rounded-2xl shadow-2xl font-mono text-[10px] sm:text-xs pointer-events-auto min-w-[160px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${accuracy && accuracy < 100 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <span className="font-bold uppercase tracking-widest text-[8px]">SATELLITE-LOCK</span>
            </div>
            <span className="opacity-50 text-[8px]">{accuracy ? `${Math.round(accuracy)}m` : 'Wait...'}</span>
          </div>

          <div className="space-y-2">
            {!hasGPS && (
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-[8px] font-black py-1 rounded-md text-white animate-pulse"
              >
                ↻ RE-SYNC GPS HARDWARE
              </button>
            )}
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
            {isLoading && <div className="text-[10px] text-green-400 animate-pulse font-bold mt-1">⟳ Calculating Route...</div>}
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

      {/* Low Accuracy Warning */}
      {accuracy && accuracy > 500 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] pointer-events-none">
          <div className="bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-bold text-center border-2 border-amber-400 pointer-events-auto">
            <span className="block text-lg">⚠️ LOW GPS PRECISION</span>
            <span className="block text-[10px] opacity-90 uppercase tracking-widest mt-1">
              Your location is {Math.round(accuracy / 1000)}km off. Please enable "High Accuracy" in your phone settings or move to an open area.
            </span>
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

      {/* Family Group Modal */}
      {showGroupModal && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 h-full w-full">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 pointer-events-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Family Link</h2>
              <button onClick={() => setShowGroupModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-900 transition-colors">✕</button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">My Nickname</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => { setUserName(e.target.value); localStorage.setItem("userName", e.target.value); }}
                  placeholder="e.g. Rahul"
                  className="w-full bg-white border-none rounded-2xl px-5 py-4 font-bold text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>

              {!groupCode ? (
                <div className="space-y-4">
                  <button onClick={() => handleGroupAction("create", null, "Our Family")} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs">
                    Create Family Group
                  </button>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-300"><span className="bg-white px-3">or join family</span></div>
                  </div>
                  <div className="space-y-2">
                    <input
                      id="join-code"
                      type="text"
                      placeholder="ENTER 5-DIGIT CODE"
                      onInput={(e) => e.target.value = e.target.value.toUpperCase()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGroupAction("join", e.target.value.toUpperCase());
                        }
                      }}
                      className="w-full bg-slate-100 border-none rounded-2xl px-4 py-4 font-mono font-black text-xl text-center focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                    />
                    <button
                      onClick={() => handleGroupAction("join", document.getElementById("join-code").value.toUpperCase())}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all tracking-widest text-xs"
                    >
                      CONFIRM JOIN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center shadow-inner">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Connect Code</span>
                    <span className="text-4xl font-black tracking-[0.2em] text-blue-600 drop-shadow-sm">{groupCode}</span>
                    <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">Give this code to family members to see them on your map instantly.</p>
                  </div>
                  <button onClick={() => handleGroupAction("leave", groupCode)} className="w-full text-red-500 font-bold py-2 text-[11px] hover:underline uppercase tracking-widest opacity-60">
                    Disconnect from Group
                  </button>
                </div>
              )}
            </div>
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

        {/* Dynamic Grid Rendering - Optimized for Mobile Performance */}
        {(gridCrowd.length > 0 ? gridCrowd : fallbackGrid)
          .filter(cell => {
            // Only render cells within a 5-step radius of current view to save mobile performance
            if (gridCrowd.length === 0) return true; // Fallback already filtered
            const r = Math.floor(cell.lat / LAT_STEP);
            const c = Math.floor(cell.lng / LNG_STEP);
            const myRLat = Math.floor(pos.lat / LAT_STEP);
            const myRLng = Math.floor(pos.lng / LNG_STEP);
            return Math.abs(r - myRLat) <= 5 && Math.abs(c - myRLng) <= 5;
          })
          .map((cell, idx) => {
            const isMe = cell.id === myCell;
            const isRecommended = recommendedCell && cell.id === recommendedCell.id;
            const isSelected = manualTarget && cell.id === manualTarget.cellId;
            const opacity = isMe ? 0.6 : (cell.count > 0 ? 0.4 : 0.2);
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

        {/* Family Members */}
        {family.map((member) => (
          <Marker
            key={member.id}
            position={[member.lat, member.lng]}
          >
            <Tooltip permanent direction="top" className="family-tooltip">
              <div className="flex flex-col items-center">
                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg">
                  {member.name}
                </span>
                <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1 shadow-lg"></div>
              </div>
            </Tooltip>
            <Circle
              center={[member.lat, member.lng]}
              radius={4}
              pathOptions={{ color: "white", fillColor: "#10b981", fillOpacity: 1, weight: 2 }}
            />
          </Marker>
        ))}

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
        .family-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .leaflet-container {
          background: #111827 !important;
        }
      `}</style>
    </div>
  );
}

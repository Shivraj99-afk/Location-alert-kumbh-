"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

// Simulation center point (Nashik)
const simCenter = [19.973, 73.7448];

export default function FamilySimulation() {
    const [isSimulating, setIsSimulating] = useState(false);
    const [leader, setLeader] = useState(null);
    const [member1, setMember1] = useState(null);
    const [member2, setMember2] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [meetingPoint, setMeetingPoint] = useState(null);
    const mapRef = useRef(null);
    const simulationInterval = useRef(null);

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

    // Calculate distance between two points (in meters)
    function getDistance(p1, p2) {
        const R = 6371e3;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Calculate meeting point (centroid)
    function calculateMeetingPoint(l, m1, m2) {
        if (!l || !m1 || !m2) return null;
        const avgLat = (l.lat + m1.lat + m2.lat) / 3;
        const avgLng = (l.lng + m1.lng + m2.lng) / 3;
        return { lat: avgLat, lng: avgLng };
    }

    // Start simulation
    const startSimulation = () => {
        // Initialize positions - all start close together
        const leaderPos = { lat: simCenter[0], lng: simCenter[1], name: "Leader (You)" };
        const member1Pos = { lat: simCenter[0] + 0.0001, lng: simCenter[1] + 0.0001, name: "Member 1" };
        const member2Pos = { lat: simCenter[0] - 0.0001, lng: simCenter[1] + 0.0001, name: "Member 2" };

        setLeader(leaderPos);
        setMember1(member1Pos);
        setMember2(member2Pos);
        setIsSimulating(true);
        setAlerts([]);

        let step = 0;

        // Simulation loop - members drift away gradually
        simulationInterval.current = setInterval(() => {
            step++;

            // Member 1 drifts to the right (east)
            setMember1(prev => ({
                ...prev,
                lng: prev.lng + 0.00015 // Drift east
            }));

            // Member 2 drifts down (south)
            setMember2(prev => ({
                ...prev,
                lat: prev.lat - 0.00015 // Drift south
            }));

            // Check distances and trigger alerts
            setLeader(currentLeader => {
                setMember1(currentMember1 => {
                    setMember2(currentMember2 => {
                        const meeting = calculateMeetingPoint(currentLeader, currentMember1, currentMember2);
                        setMeetingPoint(meeting);

                        const newAlerts = [];

                        if (meeting) {
                            const dist1 = getDistance(currentMember1, meeting);
                            const dist2 = getDistance(currentMember2, meeting);

                            // Alert threshold: 50 meters
                            if (dist1 > 50) {
                                newAlerts.push({
                                    id: 'm1',
                                    type: 'danger',
                                    msg: `⚠️ ${currentMember1.name} is drifting away! Distance: ${Math.round(dist1)}m`,
                                    member: currentMember1.name
                                });
                            }

                            if (dist2 > 50) {
                                newAlerts.push({
                                    id: 'm2',
                                    type: 'danger',
                                    msg: `⚠️ ${currentMember2.name} is drifting away! Distance: ${Math.round(dist2)}m`,
                                    member: currentMember2.name
                                });
                            }
                        }

                        setAlerts(newAlerts);
                        return currentMember2;
                    });
                    return currentMember1;
                });
                return currentLeader;
            });

            // Stop simulation after 30 steps
            if (step >= 30) {
                clearInterval(simulationInterval.current);
            }
        }, 1000); // Update every second
    };

    const stopSimulation = () => {
        if (simulationInterval.current) {
            clearInterval(simulationInterval.current);
        }
        setIsSimulating(false);
        setLeader(null);
        setMember1(null);
        setMember2(null);
        setAlerts([]);
        setMeetingPoint(null);
    };

    const resetSimulation = () => {
        stopSimulation();
        setTimeout(() => startSimulation(), 100);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 pointer-events-auto ${isSimulating ? 'bg-red-600 animate-pulse' : 'bg-gray-600'}`}>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        {isSimulating ? 'SIMULATION RUNNING' : 'SIMULATION READY'}
                    </div>
                    <div className="bg-black/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-white font-mono text-xs pointer-events-auto shadow-2xl">
                        <p className="text-orange-400 font-bold mb-1 underline text-[10px] tracking-widest uppercase">FAMILY DRIFT DEMO</p>
                        <p className="flex justify-between gap-4 font-black mt-2 text-lg">MEMBERS: <span className="text-yellow-400">03</span></p>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 pointer-events-auto">
                    {!isSimulating ? (
                        <button
                            onClick={startSimulation}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:shadow-xl hover:shadow-green-500/50 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            ▶ Start Simulation
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={resetSimulation}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                🔄 Restart
                            </button>
                            <button
                                onClick={stopSimulation}
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                ⏹ Stop
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Alert Notifications */}
            {alerts.length > 0 && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md pointer-events-none space-y-2">
                    {alerts.map((alert, idx) => (
                        <div
                            key={alert.id}
                            className="bg-rose-600 border-2 border-rose-400 p-4 rounded-2xl shadow-2xl backdrop-blur-lg animate-in slide-in-from-top-5 flex items-center gap-4"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="bg-white/20 p-2 rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase tracking-wide text-white">{alert.msg}</p>
                                <p className="text-[9px] text-white/70 font-bold mt-1">LEADER ALERT: Bring {alert.member} back to group!</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Meeting Point Info */}
            {meetingPoint && isSimulating && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm pointer-events-none">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-3xl text-black animate-in slide-in-from-bottom-5 pointer-events-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-600 p-3 rounded-2xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">Group Center</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Optimal meeting point</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {leader && (
                                <div className="bg-green-100 p-3 rounded-xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-green-600 uppercase">Leader</span>
                                    <span className="text-lg font-black text-green-700">{Math.round(getDistance(leader, meetingPoint))}m</span>
                                </div>
                            )}
                            {member1 && (
                                <div className="bg-blue-100 p-3 rounded-xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-blue-600 uppercase">M1</span>
                                    <span className="text-lg font-black text-blue-700">{Math.round(getDistance(member1, meetingPoint))}m</span>
                                </div>
                            )}
                            {member2 && (
                                <div className="bg-purple-100 p-3 rounded-xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-purple-600 uppercase">M2</span>
                                    <span className="text-lg font-black text-purple-700">{Math.round(getDistance(member2, meetingPoint))}m</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Map */}
            {!leader ? (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-blue-900">
                    <div className="text-center max-w-md px-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Family Drift Simulation</h2>
                        <p className="text-gray-400 font-medium mb-8 leading-relaxed">
                            Watch how the system detects when family members drift apart and alerts the group leader in real-time.
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-black">1</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Leader stays at center</p>
                                    <p className="text-gray-400 text-xs font-medium">You are the group leader</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-black">2</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Members drift away</p>
                                    <p className="text-gray-400 text-xs font-medium">Watch them move in different directions</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-black">3</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Alerts triggered</p>
                                    <p className="text-gray-400 text-xs font-medium">Leader receives drift warnings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <MapContainer
                    center={[simCenter[0], simCenter[1]]}
                    zoom={17}
                    className="h-full w-full bg-black z-0"
                    zoomControl={false}
                    ref={mapRef}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />

                    {/* Meeting Point */}
                    {meetingPoint && (
                        <>
                            <Circle
                                center={[meetingPoint.lat, meetingPoint.lng]}
                                radius={8}
                                pathOptions={{ color: '#fbbf24', fillColor: 'transparent', weight: 3, dashArray: '4, 4' }}
                            />
                            <Circle
                                center={[meetingPoint.lat, meetingPoint.lng]}
                                radius={3}
                                pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 1 }}
                            >
                                <Tooltip permanent direction="top" className="family-label">
                                    <div className="bg-yellow-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                        MEETING POINT
                                    </div>
                                </Tooltip>
                            </Circle>
                        </>
                    )}

                    {/* Leader (You) */}
                    {leader && (
                        <>
                            <Circle
                                center={[leader.lat, leader.lng]}
                                radius={5}
                                pathOptions={{ color: 'white', fillColor: '#22c55e', fillOpacity: 1, weight: 3 }}
                            >
                                <Tooltip permanent direction="top" className="family-label">
                                    <div className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                        {leader.name}
                                    </div>
                                </Tooltip>
                            </Circle>
                            {meetingPoint && (
                                <Polyline
                                    positions={[[leader.lat, leader.lng], [meetingPoint.lat, meetingPoint.lng]]}
                                    pathOptions={{ color: '#22c55e', weight: 3, opacity: 0.6 }}
                                />
                            )}
                        </>
                    )}

                    {/* Member 1 */}
                    {member1 && (
                        <>
                            <Circle
                                center={[member1.lat, member1.lng]}
                                radius={4}
                                pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                            >
                                <Tooltip permanent direction="top" className="family-label">
                                    <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                        {member1.name}
                                    </div>
                                </Tooltip>
                            </Circle>
                            {meetingPoint && (
                                <Polyline
                                    positions={[[member1.lat, member1.lng], [meetingPoint.lat, meetingPoint.lng]]}
                                    pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 10', opacity: 0.4 }}
                                />
                            )}
                        </>
                    )}

                    {/* Member 2 */}
                    {member2 && (
                        <>
                            <Circle
                                center={[member2.lat, member2.lng]}
                                radius={4}
                                pathOptions={{ color: 'white', fillColor: '#a855f7', fillOpacity: 1, weight: 2 }}
                            >
                                <Tooltip permanent direction="top" className="family-label">
                                    <div className="bg-purple-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                        {member2.name}
                                    </div>
                                </Tooltip>
                            </Circle>
                            {meetingPoint && (
                                <Polyline
                                    positions={[[member2.lat, member2.lng], [meetingPoint.lat, meetingPoint.lng]]}
                                    pathOptions={{ color: '#a855f7', weight: 2, dashArray: '5, 10', opacity: 0.4 }}
                                />
                            )}
                        </>
                    )}
                </MapContainer>
            )}

            <style jsx global>{`
                .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
                .family-label { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                @keyframes slide-in-from-top-5 {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slide-in-from-bottom-5 {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-in { animation: slide-in-from-top-5 0.3s ease-out; }
            `}</style>
        </div>
    );
}

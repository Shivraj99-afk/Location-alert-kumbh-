"use client";

import { useState, useEffect } from "react";
import { Camera, Activity, AlertCircle, Maximize2, Shield, Eye } from "lucide-react";

const CCTV_CAMS = [
    { id: "A", name: "Ghat Main Entrance", src: "/videos/a.mp4", density: 30, status: "Critical" },
    { id: "B", name: "VIP Parking Zone", src: "/videos/b.mp4", density: 45, status: "Fluid" },
    { id: "C", name: "Bridge Crossing West", src: "/videos/c.mp4", density: 80, status: "Open" },
    { id: "D", name: "Food Court Plateau", src: "/videos/d.mp4", density: 60, status: "Dense" }
];

export default function CCTVCommandCenter() {
    const [currentTime, setCurrentTime] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans overflow-hidden flex flex-col">
            {/* Top Bar HUD */}
            <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-8 z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase italic">CCTV HUD</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">AI-Powered Crowd Analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Global Status</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-mono font-bold">ALL SYSTEMS NOMINAL</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="text-right font-mono">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Current Time</p>
                        <p className="text-sm font-bold">{mounted && currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left: Video Grid */}
                <div className="flex-1 p-4 grid grid-cols-2 gap-4 bg-zinc-900/50 relative">
                    {/* Scanline Effect Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>

                    {CCTV_CAMS.map((cam) => (
                        <div key={cam.id} className="relative bg-black rounded-xl overflow-hidden group border border-white/5 shadow-2xl">
                            {/* Video Feed */}
                            <video
                                src={cam.src}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />

                            {/* Camera HUD Overlay */}
                            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-20">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/20 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                                            CAM {cam.id}
                                        </div>
                                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/20 text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
                                            {cam.name}
                                        </div>
                                    </div>
                                    <button className="p-2 bg-black/40 backdrop-blur rounded-lg border border-white/10 pointer-events-auto hover:bg-white/10 transition-colors">
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Density</span>
                                            <span className={`text-lg font-black font-mono ${cam.density > 70 ? 'text-red-500' : cam.density > 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {cam.density}%
                                            </span>
                                        </div>
                                        <div className="h-8 w-px bg-white/10"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Flow</span>
                                            <span className="text-xs font-bold text-white uppercase tracking-widest">{cam.status}</span>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[9px] text-white/40 mb-1">
                                        FPS: 30.0 // AUTO-TRACK: ON
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Analytics Sidebar */}
                <div className="w-96 border-l border-white/10 bg-black/20 backdrop-blur-xl p-6 flex flex-col gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <h2 className="text-sm font-black uppercase tracking-widest">Live Heatmapping</h2>
                        </div>

                        <div className="space-y-6">
                            {CCTV_CAMS.map((cam) => (
                                <div key={cam.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[11px] font-black text-white/60 uppercase">Sector {cam.id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cam.density > 70 ? 'bg-red-500/20 text-red-500' : cam.density > 40 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {cam.status}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${cam.density > 70 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : cam.density > 40 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}
                                            style={{ width: `${cam.density}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-[9px] text-zinc-500 font-bold uppercase italic">Est. Occupancy</span>
                                        <span className="text-[11px] font-mono font-bold">{cam.density}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">AI Recommendation</h4>
                            <p className="text-xs text-blue-100 leading-relaxed font-medium">
                                High density detected in Sector A. Divert incoming traffic to VIP Zone B via West Crossing.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @keyframes pulse-red {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                .animate-pulse {
                    animation: pulse-red 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}

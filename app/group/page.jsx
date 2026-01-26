"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getDistance } from '@/lib/geo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    MapPin, 
    AlertTriangle, 
    ArrowRight, 
    Plus, 
    LogIn, 
    Shield, 
    Wifi, 
    Navigation,
    Bell,
    Settings,
    X
} from 'lucide-react';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

// Import Leaflet CSS - we do this in the component that uses it
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const LeafletFix = () => {
    useEffect(() => {
        const L = require('leaflet');
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    }, []);
    return null;
};

export default function GroupTrackerPage() {
    const [userId] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('group_tracker_user_id');
            if (saved) return saved;
            const newId = uuidv4();
            localStorage.setItem('group_tracker_user_id', newId);
            return newId;
        }
        return uuidv4();
    });

    const [userName, setUserName] = useState('');
    const [groupCode, setGroupCode] = useState('');
    const [currentGroup, setCurrentGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [threshold, setThreshold] = useState(50);
    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState('setup'); // setup, tracking
    const [safeCentroid, setSafeCentroid] = useState(null);

    const watchId = useRef(null);

    // 1. Setup Geolocation Tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            addAlert('Geolocation is not supported by your browser', 'error');
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setMyLocation({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Geo error:", error);
                addAlert('Location access denied. Please enable GPS.', 'error');
            },
            { enableHighAccuracy: true, distanceFilter: 1 }
        );
        setIsTracking(true);
    }, []);

    const stopTracking = useCallback(() => {
        if (watchId.current) {
            navigator.geolocation.clearWatch(watchId.current);
        }
        setIsTracking(false);
    }, []);

    // 2. Sync Location to Supabase
    useEffect(() => {
        if (isTracking && myLocation && currentGroup) {
            const updateLocation = async () => {
                const { error } = await supabase
                    .from('members')
                    .upsert({
                        user_id: userId,
                        group_id: currentGroup.id,
                        name: userName || 'Anonymous',
                        latitude: myLocation.lat,
                        longitude: myLocation.lng,
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) console.error("Update error:", error);
            };

            const timer = setTimeout(updateLocation, 2000);
            return () => clearTimeout(timer);
        }
    }, [myLocation, isTracking, currentGroup, userId, userName]);

    // 3. Real-time Subscription to Group Members
    useEffect(() => {
        if (currentGroup) {
            const fetchMembers = async () => {
                const { data, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('group_id', currentGroup.id);
                
                if (data) setMembers(data);
            };
            fetchMembers();

            const channel = supabase
                .channel(`group-${currentGroup.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'members',
                    filter: `group_id=eq.${currentGroup.id}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        setMembers(prev => {
                            const index = prev.findIndex(m => m.user_id === payload.new.user_id);
                            if (index > -1) {
                                const next = [...prev];
                                next[index] = payload.new;
                                return next;
                            }
                            return [...prev, payload.new];
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setMembers(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentGroup]);

    // 4. Distance Calculation & Alerts
    useEffect(() => {
        if (myLocation && members.length > 1) {
            const tooFar = members.filter(m => {
                if (m.user_id === userId) return false;
                const dist = getDistance(myLocation.lat, myLocation.lng, m.latitude, m.longitude);
                return dist > threshold;
            });

            if (tooFar.length > 0) {
                const names = tooFar.map(m => m.name).join(', ');
                addAlert(`Member separated: ${names} are too far!`, 'warning');
            } else {
                setAlerts(prev => prev.filter(a => a.type !== 'warning'));
            }
        }
    }, [myLocation, members, threshold, userId]);

    // 5. Calculate Group Centroid
    useEffect(() => {
        if (members.length > 0) {
            const safeMembers = members.filter(m => {
                if (m.user_id === userId) return false;
                return true; 
            });

            if (safeMembers.length > 0) {
                const totalLat = safeMembers.reduce((sum, m) => sum + m.latitude, 0);
                const totalLng = safeMembers.reduce((sum, m) => sum + m.longitude, 0);
                setSafeCentroid({
                    lat: totalLat / safeMembers.length,
                    lng: totalLng / safeMembers.length
                });
            }
        }
    }, [members, userId]);

    // 6. Group Logic
    const createGroup = async () => {
        if (!userName) return addAlert('Please enter your name', 'error');
        setIsLoading(true);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data, error } = await supabase
            .from('groups')
            .insert({ code, threshold_distance: threshold })
            .select()
            .single();

        if (error) {
            addAlert('Failed to create group', 'error');
            setIsLoading(false);
            return;
        }

        setCurrentGroup(data);
        startTracking();
        setStage('tracking');
        setIsLoading(false);
    };

    const joinGroup = async () => {
        if (!userName) return addAlert('Please enter your name', 'error');
        if (!groupCode) return addAlert('Please enter a group code', 'error');
        setIsLoading(true);

        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('code', groupCode.toUpperCase())
            .single();

        if (error || !data) {
            addAlert('Group not found', 'error');
            setIsLoading(false);
            return;
        }

        setCurrentGroup(data);
        setThreshold(data.threshold_distance);
        startTracking();
        setStage('tracking');
        setIsLoading(false);
    };

    const addAlert = (message, type = 'info') => {
        const id = Date.now();
        setAlerts(prev => {
            if (type === 'warning' && prev.some(a => a.type === 'warning')) return prev;
            return [...prev, { id, message, type }];
        });
        if (type !== 'warning') {
            setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
        }
    };

    // Helper to check separation status
    const amISeparated = () => {
        const myAlert = alerts.find(a => a.message.includes('Member separated') && a.type === 'warning');
        // Simple heuristic: if there's a separation alert, check my distance to centroid
        if (myAlert && safeCentroid && myLocation) {
             const dist = getDistance(myLocation.lat, myLocation.lng, safeCentroid.lat, safeCentroid.lng);
             return dist > threshold;
        }
        return false;
    };
    
    const isSomeoneElseSeparated = () => {
         return alerts.some(a => a.message.includes('Member separated') && a.type === 'warning') && !amISeparated();
    };

    return (
        <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative', background: '#0a0a0a' }}>
            {/* Same layout... */}
            <LeafletFix />
            
            <AnimatePresence mode="wait">
                {stage === 'setup' ? (
                   // ... (setup remains same) ...
                   <div 
                        key="setup" 
                        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 20, position: 'relative' }}
                    >
                         {/* Header for Setup */}
                        <header className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50">
                             <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold tracking-tight text-white">CrowdSafe</span>
                            </div>
                        </header>

                        {/* Setup Form */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center p-6 space-y-8 max-w-md w-full"
                        >
                            <div className="text-center space-y-2">
                                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent italic">
                                    Stay Together.
                                </h1>
                                <p className="text-zinc-400">
                                    Real-time group safety monitoring.
                                </p>
                            </div>

                            <div className="w-full space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter name..." 
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={createGroup}
                                        disabled={isLoading}
                                        className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-all"
                                    >
                                        <Plus className="w-6 h-6 text-white" />
                                        <span className="font-bold text-white">Create</span>
                                    </button>

                                    <div className="flex flex-col gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="CODE" 
                                            value={groupCode}
                                            onChange={(e) => setGroupCode(e.target.value)}
                                            className="bg-zinc-900 border border-zinc-800 p-2 text-center rounded-xl text-white font-mono uppercase"
                                        />
                                        <button 
                                            onClick={joinGroup}
                                            disabled={isLoading}
                                            className="p-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200"
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    <div key="tracking" style={{ width: '100%', height: '100%', position: 'relative' }}>
                        
                        {/* 1. THE MAP LAYER (z-index: 0) */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                            <MapContainer 
                                center={myLocation ? [myLocation.lat, myLocation.lng] : [20.0086, 73.7924]} 
                                zoom={18} 
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer 
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OSM'
                                />
                                {myLocation && (
                                    <>
                                        <Circle 
                                            center={[myLocation.lat, myLocation.lng]} 
                                            radius={threshold}
                                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
                                        />
                                        
                                        {/* Connect separated user to group center */}
                                        {amISeparated() && safeCentroid && (
                                            <Polyline 
                                                positions={[
                                                    [myLocation.lat, myLocation.lng], 
                                                    [safeCentroid.lat, safeCentroid.lng]
                                                ]}
                                                pathOptions={{ 
                                                    color: '#ef4444', 
                                                    weight: 4, 
                                                    dashArray: '10, 10', 
                                                    opacity: 0.8 
                                                }} 
                                            />
                                        )}

                                        {members.map(m => (
                                            <Marker key={m.id} position={[m.latitude, m.longitude]}>
                                                <Tooltip permanent direction="top" offset={[0, -32]} className="custom-tooltip">
                                                    <div className="bg-black/80 px-2 py-1 rounded text-white text-xs font-bold border border-white/20">
                                                        {m.name}
                                                    </div>
                                                </Tooltip>
                                            </Marker>
                                        ))}
                                    </>
                                )}
                            </MapContainer>
                        </div>

                        {/* SEPARATION OVERLAY FOR ME */}
                        {amISeparated() && (
                            <div className="absolute inset-0 z-[15] pointer-events-none flex items-center justify-center">
                                <div className="absolute inset-0 border-[12px] border-red-500/50 animate-pulse" />
                                <div className="bg-red-600 text-white px-8 py-4 rounded-3xl font-black text-2xl shadow-2xl animate-bounce">
                                    RETURN TO GROUP
                                </div>
                            </div>
                        )}

                        {/* STAY PUT OVERLAY FOR OTHERS */}
                        {isSomeoneElseSeparated() && (
                            <div className="absolute top-24 left-0 right-0 z-[15] pointer-events-none flex justify-center">
                                <div className="bg-orange-600 text-white px-6 py-2 rounded-full font-bold shadow-xl animate-pulse flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    STAY PUT - WAIT FOR MEMBER
                                </div>
                            </div>
                        )}

                        {/* 2. LOADING OVERLAY (z-index: 5) */}
                        {!myLocation && (
                            <div className="absolute inset-0 bg-black/80 z-[5] flex flex-col items-center justify-center text-center p-6">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <h3 className="text-white font-bold">LOCATING YOU...</h3>
                                <p className="text-zinc-500 text-sm">Please allow GPS permission</p>
                            </div>
                        )}

                        {/* 3. UI OVERLAY (z-index: 10) */}
                        {/* Header */}
                        <header className="absolute top-0 left-0 right-0 px-4 py-3 flex items-center justify-between z-[10] pointer-events-none">
                            <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="font-mono font-bold text-white tracking-widest">{currentGroup?.code}</span>
                            </div>
                            <button 
                                onClick={() => { stopTracking(); setStage('setup'); setCurrentGroup(null); }}
                                className="pointer-events-auto p-2 bg-black/40 backdrop-blur text-white rounded-full hover:bg-black/60"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* ALERTS */}
                        <div className="absolute top-16 left-0 right-0 px-4 flex flex-col items-center gap-2 z-[10] pointer-events-none">
                            <AnimatePresence>
                                {alerts.map(alert => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl ${
                                            alert.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-white'
                                        }`}
                                    >
                                        {alert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                        <span className="text-sm font-bold">{alert.message}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* BOTTOM CONTROLS */}
                        <div className="absolute bottom-6 left-0 right-0 px-6 flex items-end justify-between z-[10] pointer-events-none">
                            {/* Member List */}
                            <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl max-w-[200px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-3 h-3 text-blue-400" />
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Status</span>
                                </div>
                                <div className="flex -space-x-2 mb-2">
                                    {members.map(m => (
                                        <div key={m.id} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-xs font-bold text-white">
                                            {m.name[0]}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-300">
                                    {members.length} active within {threshold}m
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pointer-events-auto">
                                <button 
                                    onClick={() => {
                                        const other = members.find(m => m.user_id !== userId);
                                        if (other) {
                                            const fakeLat = other.latitude + 0.005;
                                            const fakeLng = other.longitude + 0.005;
                                            setMembers(prev => prev.map(m => 
                                                m.user_id === other.user_id ? { ...m, latitude: fakeLat, longitude: fakeLng } : m
                                            ));
                                            addAlert(`SIMULATION: ${other.name} moved far away`, 'warning');
                                        } else {
                                            if (members.length < 2) {
                                                // Create fake member for testing if alone
                                                const fakeId = uuidv4();
                                                const fakeMember = {
                                                    id: fakeId,
                                                    user_id: fakeId,
                                                    name: 'Test Member',
                                                    latitude: myLocation?.lat ? myLocation.lat + 0.005 : 20.0,
                                                    longitude: myLocation?.lng ? myLocation.lng + 0.005 : 73.0,
                                                };
                                                setMembers(prev => [...prev, fakeMember]);
                                                addAlert("SIMULATION: Created fake member (Test User)", 'info');
                                            }
                                        }
                                    }}
                                    className="w-12 h-12 bg-zinc-900 border border-zinc-700 text-orange-500 rounded-full flex items-center justify-center shadow-lg"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => myLocation && window.map?.setView([myLocation.lat, myLocation.lng])}
                                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg"
                                >
                                    <Navigation className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                .custom-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .leaflet-bar { opacity: 0; pointer-events: none; }
            `}</style>
        </div>
    );
}

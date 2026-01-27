"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useState, useMemo, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, MapPin, Star, X, Coffee, Zap, Shield, Anchor, User, Phone, Utensils, Hotel, ShoppingBag } from "lucide-react";
import { mockBusinesses } from "../data/mockBusinesses";

// Fix leaflet icons
const getIcon = (category) => {
    let iconHtml = '';
    switch (category) {
        case 'restaurant': iconHtml = '<div class="bg-orange-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg></div>'; break;
        case 'temporary food stall': iconHtml = '<div class="bg-yellow-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg></div>'; break;
        case 'mobile chargers': iconHtml = '<div class="bg-blue-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 10h10l-9 10 2-10H3l10-10z"></path></svg></div>'; break;
        case 'locker tents': iconHtml = '<div class="bg-purple-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>'; break;
        case 'boatmen': iconHtml = '<div class="bg-cyan-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10a6 6 0 0 1-10.53 3.82l-2.61-3.26A6 6 0 1 1 15 10h7z"></path><path d="m10 10 3 3"></path><path d="m10 13 3-3"></path><path d="M2 21h12"></path></svg></div>'; break;
        case 'guides': iconHtml = '<div class="bg-green-600 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>'; break;
        case 'selling clothes': iconHtml = '<div class="bg-pink-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z"></path></svg></div>'; break;
        case 'hotels': iconHtml = '<div class="bg-indigo-600 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"></path><path d="M4 15V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"></path><line x1="12" y1="11" x2="12" y2="11"></line></svg></div>'; break;
        default: iconHtml = '<div class="bg-gray-500 p-2 rounded-full shadow-lg border-2 border-white text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>';
    }
    return L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
};

const userIcon = L.divIcon({
    html: '<div class="relative"><div class="absolute -inset-1 bg-blue-500 rounded-full animate-ping opacity-75"></div><div class="relative bg-white p-1 rounded-full shadow-xl border-2 border-blue-500 text-blue-500 flex items-center justify-center"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.2"/><circle cx="12" cy="12" r="4"/></svg></div></div>',
    className: 'user-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Component to handle map center updates
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 17, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function LocalBusinessMap() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBusiness, setSelectedBusiness] = useState(null); // For detail panel
    const [highlightedBusiness, setHighlightedBusiness] = useState(null); // For path - persists when panel closes
    const [userLocation, setUserLocation] = useState([20.00639, 73.79168]); // Default Ramkund
    const [isTracking, setIsTracking] = useState(false);
    const [showRoute, setShowRoute] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [realRouteCoordinates, setRealRouteCoordinates] = useState([]); // Actual road path from OSRM

    // Filter businesses based on search
    const filteredBusinesses = useMemo(() => {
        return mockBusinesses.filter(b => 
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // Handle Geolocation
    useEffect(() => {
        if ("geolocation" in navigator && isTracking) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [isTracking]);

    const handleBusinessClick = (business) => {
        setSelectedBusiness(business);
        setHighlightedBusiness(business); // Keep for path
        setShowRoute(true);
        setShowContact(false);
    };

    const toggleTracking = () => {
        setIsTracking(!isTracking);
    };

    // Fetch real route from OSRM API when highlighted business changes
    useEffect(() => {
        if (!highlightedBusiness) {
            setRealRouteCoordinates([]);
            return;
        }

        const fetchRoute = async () => {
            try {
                const start = `${userLocation[1]},${userLocation[0]}`; // lon,lat format for OSRM
                const end = `${highlightedBusiness.lng},${highlightedBusiness.lat}`;
                
                // Using public OSRM API for routing
                const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                    // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
                    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    setRealRouteCoordinates(coords);
                } else {
                    // Fallback to straight line if routing fails
                    setRealRouteCoordinates([userLocation, [highlightedBusiness.lat, highlightedBusiness.lng]]);
                }
            } catch (error) {
                console.error('Routing error:', error);
                // Fallback to straight line
                setRealRouteCoordinates([userLocation, [highlightedBusiness.lat, highlightedBusiness.lng]]);
            }
        };

        fetchRoute();
    }, [userLocation, highlightedBusiness]);

    const routePositions = useMemo(() => {
        return realRouteCoordinates;
    }, [realRouteCoordinates]);

    return (
        <div className="relative w-full h-screen bg-neutral-50 overflow-hidden font-sans">
            {/* Search Overlay - Dark/Black Theme */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
                <div className="relative group">
                    <div className="absolute inset-0 bg-neutral-900 shadow-2xl rounded-2xl border border-neutral-800 group-focus-within:ring-2 ring-blue-500/50 transition-all duration-300"></div>
                    <div className="relative flex items-center px-4 py-4">
                        <Search className="text-neutral-400 w-5 h-5 mr-3" />
                        <input 
                            type="text" 
                            placeholder="Search business, food, tents..." 
                            className="bg-transparent border-none outline-none w-full text-white placeholder-neutral-500 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="ml-2 p-1 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Search Suggestions - Dark Theme */}
                {searchQuery && filteredBusinesses.length > 0 && !selectedBusiness && (
                    <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                        {filteredBusinesses.map(b => (
                            <button 
                                key={b.id}
                                onClick={() => handleBusinessClick(b)}
                                className="w-full text-left px-5 py-3 hover:bg-neutral-800 flex items-center gap-3 transition-colors border-b border-neutral-800 last:border-0"
                            >
                                <div className="p-2 bg-blue-900/40 rounded-lg text-blue-400">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="max-w-[70%]">
                                    <p className="font-bold text-white text-sm truncate">{b.name}</p>
                                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">{b.category}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Container */}
            <MapContainer
                center={userLocation}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                className="z-0"
                eventHandlers={{
                    click: () => {
                        setSelectedBusiness(null); // Close popup when clicking map
                        setShowContact(false);
                    }
                }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapUpdater center={selectedBusiness ? [selectedBusiness.lat, selectedBusiness.lng] : null} />

                {/* User Location Marker */}
                <Marker position={userLocation} icon={userIcon}>
                    <Popup className="premium-popup">
                        <div className="font-bold text-blue-600">Your Live Location</div>
                    </Popup>
                </Marker>

                {/* Business Markers */}
                {filteredBusinesses.map(b => (
                    <Marker 
                        key={b.id} 
                        position={[b.lat, b.lng]} 
                        icon={getIcon(b.category)}
                        eventHandlers={{
                            click: () => handleBusinessClick(b)
                        }}
                    >
                        <Popup className="premium-popup">
                            <div className="p-1">
                                <h4 className="font-black text-gray-900 border-b border-gray-100 pb-1 mb-1">{b.name}</h4>
                                <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-[10px] font-bold">{b.rating}</span>
                                </div>
                                <button 
                                    onClick={() => handleBusinessClick(b)}
                                    className="w-full py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase tracking-widest mt-1"
                                >
                                    View Details
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Real Road-Based Route Path */}
                {showRoute && highlightedBusiness && routePositions.length > 0 && (
                    <>
                        {/* Outer glow for depth */}
                        <Polyline 
                            positions={routePositions}
                            pathOptions={{ 
                                color: '#1e40af', 
                                weight: 10, 
                                opacity: 0.3 
                            }}
                        />
                        {/* Main road path */}
                        <Polyline 
                            positions={routePositions}
                            pathOptions={{ 
                                color: '#3b82f6', 
                                weight: 5, 
                                opacity: 0.9,
                                lineJoin: 'round',
                                lineCap: 'round'
                            }}
                        />
                        {/* Inner highlight line */}
                        <Polyline 
                            positions={routePositions}
                            pathOptions={{ 
                                color: '#60a5fa', 
                                weight: 2, 
                                opacity: 1,
                                lineJoin: 'round',
                                lineCap: 'round',
                                className: 'animated-path'
                            }}
                        />
                    </>
                )}
                
                {/* DEBUG: Green direct line (can be removed later) */}
                {highlightedBusiness && (
                    <Polyline 
                        positions={[[userLocation[0], userLocation[1]], [highlightedBusiness.lat, highlightedBusiness.lng]]}
                        pathOptions={{ 
                            color: '#00ff00', 
                            weight: 3, 
                            opacity: 0.4,
                            dashArray: '10, 10'
                        }}
                    />
                )}
            </MapContainer>

            {/* Floating Controls */}
            <div className="absolute bottom-10 right-6 z-[1000] flex flex-col gap-3">
                <button 
                    onClick={toggleTracking}
                    className={`p-4 rounded-2xl shadow-2xl border border-white transition-all duration-300 ${isTracking ? 'bg-blue-600 text-white scale-110' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                    <Navigation className={`w-6 h-6 ${isTracking ? 'fill-current' : ''}`} />
                </button>
            </div>

            {/* Business Detail Panel - White Premium UI */}
            {selectedBusiness && (
                <div className="absolute inset-x-0 bottom-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.1)] border-t border-gray-100 animate-in slide-in-from-bottom-full duration-500 overflow-hidden max-h-[85vh] flex flex-col">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
                    
                    <div className="px-8 pb-8 pt-4 overflow-y-auto scrollbar-hide">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                                    {selectedBusiness.category}
                                </span>
                                <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
                                    {selectedBusiness.name}
                                </h2>
                                <div className="flex items-center mt-2 gap-4">
                                    <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-0.5 rounded-lg">
                                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                        <span className="text-sm font-bold text-yellow-700">{selectedBusiness.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-xs font-medium">Near Ramkund</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedBusiness(null);
                                    // Keep highlightedBusiness and path visible
                                }}
                                className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="text-gray-500 text-sm leading-relaxed mb-8">
                            {selectedBusiness.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button 
                                onClick={() => {
                                    setShowRoute(true);
                                    setSelectedBusiness(null); // Close popup to see path clearly
                                }}
                                className="flex items-center justify-center gap-2 py-4 bg-blue-600 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <Navigation className="w-4 h-4" />
                                Path visibility
                            </button>
                            <button 
                                onClick={() => setShowContact(!showContact)}
                                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${showContact ? 'bg-neutral-900 text-white' : 'bg-white border-2 border-gray-100 text-gray-900 hover:border-gray-200'}`}
                            >
                                <Phone className="w-4 h-4" />
                                Contact
                            </button>
                        </div>

                        {/* Contact Info Section */}
                        {showContact && (
                            <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 animate-in zoom-in-95 duration-300">
                                <h3 className="text-blue-900 font-black flex items-center gap-2 mb-2">
                                    <Phone className="w-5 h-5" /> Contact Details
                                </h3>
                                <p className="text-blue-700 font-bold mb-4">{selectedBusiness.phone}</p>
                                <a 
                                    href={`tel:${selectedBusiness.phone}`}
                                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200"
                                >
                                    Call Now
                                </a>
                            </div>
                        )}

                        {/* Menu/Price Section */}
                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                {(selectedBusiness.menu || selectedBusiness.prices) ? (
                                    <Utensils className="w-5 h-5 text-blue-500" />
                                ) : <Zap className="w-5 h-5 text-blue-500" />}
                                {selectedBusiness.menu ? "Full Menu" : "Service Pricing"}
                            </h3>
                            
                            <div className="space-y-4">
                                {(selectedBusiness.menu || selectedBusiness.prices || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:scale-150 transition-transform"></div>
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.item}</span>
                                        </div>
                                        <span className="bg-white px-4 py-1.5 rounded-xl border border-gray-100 text-sm font-black text-gray-900 shadow-sm">
                                            {item.price}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {!selectedBusiness.menu && !selectedBusiness.prices && (
                                <p className="text-gray-400 text-xs italic text-center py-4">Contact business for real-time rates</p>
                            )}
                        </div>

                        <div className="mt-8 text-center pb-4">
                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">Kumbh Mela Visibility Platform</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Hint */}
            {!selectedBusiness && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000] bg-white/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/50 shadow-xl animate-bounce">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tap markers to explore items & prices</p>
                </div>
            )}
            
            <style jsx global>{`
                .premium-popup .leaflet-popup-content-wrapper {
                    border-radius: 1.5rem;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .premium-popup .leaflet-popup-content {
                    margin: 12px;
                }
                .premium-popup .leaflet-popup-tip {
                    display: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .animated-path {
                    stroke-dasharray: 10, 20;
                    animation: dash 1s linear infinite;
                }
                @keyframes dash {
                    from {
                        stroke-dashoffset: 30;
                    }
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>
    );
}

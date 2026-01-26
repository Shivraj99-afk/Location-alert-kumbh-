"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

export default function VolunteerPage() {
    const [active, setActive] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [pos, setPos] = useState(null);
    const [saving, setSaving] = useState(false);

    // Initialize
    useEffect(() => {
        const sessionId = getSessionId();
        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from("volunteers")
                .select("*")
                .eq("id", sessionId)
                .single();

            if (data) {
                setName(data.display_name);
                setPhone(data.phone || "");
                setActive(data.active);
            }
        };
        fetchStatus();

        navigator.geolocation.getCurrentPosition(
            (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => console.log("Location denied")
        );
    }, []);

    // Sync location if active
    useEffect(() => {
        if (!active || !pos) return;

        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(async (p) => {
                const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };
                setPos(newPos);

                await supabase.from("volunteers").update({
                    lat: newPos.lat,
                    lng: newPos.lng,
                    updated_at: new Date().toISOString()
                }).eq("id", getSessionId());
            });
        }, 10000);

        return () => clearInterval(interval);
    }, [active, pos]);

    const toggleActive = async () => {
        if (!name.trim()) return alert("Please enter a display name first");

        setSaving(true);
        const sessionId = getSessionId();

        const { error } = await supabase.from("volunteers").upsert({
            id: sessionId,
            display_name: name,
            phone: phone,
            active: !active,
            lat: pos?.lat,
            lng: pos?.lng,
            updated_at: new Date().toISOString()
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            setActive(!active);
        }
        setSaving(false);
    };

    return (
        <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Hub</h1>
                <p className="text-gray-600 font-medium">Be the eyes and ears of the community.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        Your Identity
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={active}
                        placeholder="Display Name (e.g. Volunteer Ravi)"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 mb-4 focus:border-blue-500 outline-none text-gray-900 font-medium disabled:opacity-50"
                    />
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={active}
                        placeholder="Phone (Optional)"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none text-gray-900 font-medium disabled:opacity-50"
                    />
                </div>

                <div className={`p-6 rounded-3xl border-2 transition-all ${active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className={`font-bold transition-colors ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                                {active ? 'Status: ACTIVE' : 'Status: INACTIVE'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {active ? 'Your location is shared with nearby people in need.' : 'Turn on to start helping.'}
                            </p>
                        </div>
                        <button
                            onClick={toggleActive}
                            disabled={saving}
                            className={`w-14 h-8 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {active && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-bold animate-pulse">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            Broadcasting your help...
                        </div>
                    )}
                </div>

                <div className="pt-4">
                    <a
                        href="/volunteer/report"
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 mb-4 no-underline"
                    >
                        📸 AI Crowd Reporter
                    </a>
                    <div className="text-center">
                        <a href="/lost/feed" className="text-gray-400 font-bold hover:text-gray-600 transition-colors">
                            ← Back to Feed
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

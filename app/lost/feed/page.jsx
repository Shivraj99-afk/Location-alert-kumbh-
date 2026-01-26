"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import { zones } from "@/app/location/zones/data";

export default function LostFeedPage() {
    const [reports, setReports] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [helpMessage, setHelpMessage] = useState("");
    const [activeReportId, setActiveReportId] = useState(null);

    const getDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    };

    const fetchReports = async () => {
        const { data: reportsData } = await supabase
            .from("lost_reports")
            .select(`*, help_updates (*)`)
            .order("created_at", { ascending: false });

        const { data: volData } = await supabase
            .from("volunteers")
            .select("*")
            .eq("active", true);

        if (reportsData) setReports(reportsData);
        if (volData) setVolunteers(volData);
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();

        // Real-time updates
        const channel = supabase
            .channel("lost_updates")
            .on("postgres_changes", { event: "*", schema: "public", table: "lost_reports" }, fetchReports)
            .on("postgres_changes", { event: "*", schema: "public", table: "help_updates" }, fetchReports)
            .on("postgres_changes", { event: "*", schema: "public", table: "volunteers" }, fetchReports)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const handleHelp = async (reportId) => {
        if (!helpMessage.trim()) return;

        const { error } = await supabase.from("help_updates").insert({
            report_id: reportId,
            message: helpMessage,
            helper_id: getSessionId(),
        });

        if (!error) {
            setHelpMessage("");
            setActiveReportId(null);
            fetchReports();
        }
    };

    const markAsFound = async (reportId, currentZone) => {
        const { error } = await supabase
            .from("lost_reports")
            .update({
                status: "found",
                found_by: getSessionId(),
                found_at: new Date().toISOString(),
                found_at_location: currentZone,
            })
            .eq("id", reportId);

        if (!error) fetchReports();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading alerts...</div>;

    return (
        <div className="max-w-xl mx-auto p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Community Safety</h1>
                <a href="/lost/report" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                    Report Lost
                </a>
            </div>

            <div className="space-y-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {report.photo_url && (
                            <img src={report.photo_url} className="w-full h-64 object-cover" alt="Lost item" />
                        )}

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
                                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        Seen at {zones.find(z => z.id === report.last_seen_zone)?.name || report.last_seen_zone}
                                    </span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${report.status === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {report.status}
                                </div>
                            </div>

                            <p className="text-gray-700 mb-4">{report.description}</p>

                            {report.status === 'found' && (
                                <div className="bg-green-50 border border-green-100 p-3 rounded-xl mb-4 text-green-800 text-sm">
                                    ✅ Found near {report.found_at_location} <br />
                                    🕒 {new Date(report.found_at).toLocaleString()}
                                </div>
                            )}

                            {/* Nearby Volunteers */}
                            {report.status === 'lost' && (
                                <div className="mb-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nearby Help</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {volunteers
                                            .filter(v => getDistance(v.lat, v.lng, report.lat, report.lng) < 200)
                                            .map(v => (
                                                <div key={v.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-100 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                                    {v.display_name}
                                                </div>
                                            ))
                                        }
                                        {volunteers.filter(v => getDistance(v.lat, v.lng, report.lat, report.lng) < 200).length === 0 && (
                                            <span className="text-xs text-gray-400 italic">No volunteers within 200m yet.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Help Updates Section */}
                            <div className="border-t border-gray-50 pt-4 mt-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Updates</h3>
                                <div className="space-y-3 mb-4">
                                    {report.help_updates?.map((update) => (
                                        <div key={update.id} className="text-sm flex gap-2">
                                            <span className="font-bold text-blue-600">Helper:</span>
                                            <span className="text-gray-600 font-medium">{update.message}</span>
                                        </div>
                                    ))}
                                </div>

                                {report.status === 'lost' && (
                                    <div className="flex gap-2">
                                        {activeReportId === report.id ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={helpMessage}
                                                    onChange={(e) => setHelpMessage(e.target.value)}
                                                    placeholder="Type an update..."
                                                    className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                                />
                                                <button
                                                    onClick={() => handleHelp(report.id)}
                                                    className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                                                >
                                                    Send
                                                </button>
                                                <button
                                                    onClick={() => setActiveReportId(null)}
                                                    className="text-gray-400 text-xs font-bold px-2"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setActiveReportId(report.id)}
                                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-sm transition-colors"
                                                >
                                                    I have info
                                                </button>
                                                <button
                                                    onClick={() => markAsFound(report.id, report.last_seen_zone)}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-sm shadow-sm transition-colors"
                                                >
                                                    Mark as Found
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {reports.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400">All is safe. No active reports.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import { zones } from "@/app/location/zones/data";

export default function ReportLostPage() {
    const router = useRouter();
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pos, setPos] = useState(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => console.log("Position not available")
        );
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.target);
            const title = formData.get("title");
            const description = formData.get("description");
            const zone = formData.get("zone");
            const sessionId = getSessionId();

            let photoUrl = "";

            if (photo) {
                const fileExt = photo.name.split(".").pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `lost/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("lost-found-photos")
                    .upload(filePath, photo);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from("lost-found-photos")
                    .getPublicUrl(filePath);

                photoUrl = publicUrl;
            }

            const { error: dbError } = await supabase.from("lost_reports").insert({
                title,
                description,
                photo_url: photoUrl,
                last_seen_zone: zone,
                lat: pos?.lat || null,
                lng: pos?.lng || null,
                status: "lost",
                created_by: sessionId,
            });

            if (dbError) throw dbError;

            router.push("/lost/feed");
        } catch (err) {
            alert("Error reporting: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Lost</h1>
            <p className="text-gray-600 mb-8">Help the community find what was lost.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        What is lost?
                    </label>
                    <input
                        name="title"
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none bg-gray-50 transition-all"
                        placeholder="e.g. Person, Bag, Wallet"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Photo
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files[0])}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Last Seen Zone
                    </label>
                    <select
                        name="zone"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none bg-gray-50 transition-all"
                    >
                        <option value="">Select a zone</option>
                        {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                                {z.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Details
                    </label>
                    <textarea
                        name="description"
                        rows="4"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none bg-gray-50 transition-all text-gray-900"
                        placeholder="Description, clothing, identifying marks..."
                    ></textarea>
                </div>

                <button
                    disabled={loading}
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {loading ? "Posting..." : "Post Alert"}
                </button>
            </form>
        </div>
    );
}

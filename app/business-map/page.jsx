"use client";

import dynamic from "next/dynamic";

const LocalBusinessMap = dynamic(() => import("../components/LocalBusinessMap"), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-white font-sans">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6 shadow-2xl shadow-blue-100"></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Local Visibility</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Loading Business Map...</p>
        </div>
    )
});

export default function BusinessVisibilityPage() {
    return (
        <main className="h-screen w-full">
            <LocalBusinessMap />
        </main>
    );
}

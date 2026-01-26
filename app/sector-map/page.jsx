"use client";

import dynamic from "next/dynamic";

const SectorMapView = dynamic(() => import("../components/SectorMapView"), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100 font-bold">Loading Sector Map...</div>
});

export default function SectorManagementPage() {
    return <SectorMapView />;
}

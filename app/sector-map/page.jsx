"use client";

import dynamic from "next/dynamic";

const GenericSectorMap = dynamic(() => import("../components/GenericSectorMap"), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100 font-bold">Loading Sector Map...</div>
});

const originalPoints = [
    [20.0090101, 73.7918293],
    [20.0091008, 73.7926876],
    [20.0085564, 73.7930417],
    [20.0081633, 73.7928485],
    [20.0080927, 73.7920546],
    [20.0086472, 73.7917971]
];

export default function SectorManagementPage() {
    return (
        <GenericSectorMap
            points={originalPoints}
            mapCenter={[20.0086, 73.7924]}
            namePrefix="Main"
        />
    );
}

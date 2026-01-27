"use client";

import dynamic from "next/dynamic";

const GenericSectorMap = dynamic(() => import("../components/GenericSectorMap"), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100 font-bold">Loading Sector Map...</div>
});

const originalPoints = [
    [20.00757605670214, 73.79027366638185],
    [20.009171010117733, 73.79168987274171],
    [20.004688948010305, 73.7934708595276],
    [20.00412363381382, 73.79128217697145]
];

export default function SectorManagementPage() {
    return (
        <GenericSectorMap
            points={originalPoints}
            mapCenter={[20.00639, 73.79168]}
            namePrefix="Regional"
            rows={6}
            cols={6}
        />
    );
}

"use client";

import dynamic from "next/dynamic";

const GenericSectorMap = dynamic(() => import("../components/GenericSectorMap"), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100 font-bold">Loading Custom Sector Map...</div>
});

const customPoints = [
    [19.968802286296103, 73.67109775543214],
    [19.961310002131995, 73.67234230041505],
    [19.961188830191443, 73.66558313369752],
    [19.96777237076012, 73.66590499877931]
];

const center = [19.965, 73.669];

export default function CustomSectorPage() {
    return (
        <GenericSectorMap
            points={customPoints}
            mapCenter={center}
            namePrefix="Nashik-B"
            rows={12}
            cols={12}
        />
    );
}

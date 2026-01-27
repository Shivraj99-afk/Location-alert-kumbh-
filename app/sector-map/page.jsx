"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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

const crowdRoad = [
    [20.008242305031807, 73.79269838333131],
    [20.008585522767333, 73.79289150238039],
    [20.00867973022787, 73.79298806190492],
    [20.008646090525296, 73.79439353942873]
];

const safeRoad = [
    [20.007952915748863, 73.79288613796236],
    [20.007942821079702, 73.79298806190492],
    [20.007872158377296, 73.79343867301942],
    [20.007841874352284, 73.79356205463411],
    [20.00776616426421, 73.79376053810121],
    [20.007665217423476, 73.79407167434694],
    [20.007695501482505, 73.7941199541092],
    [20.00808919371942, 73.79426479339601],
    [20.00846774301828, 73.79440426826478],
    [20.008558594714515, 73.79445254802705]
];

const startPos = [20.00923998076402, 73.79473686218263];

export default function SectorManagementPage() {
    return (
        <GenericSectorMap
            points={originalPoints}
            crowdRoad={crowdRoad}
            safeRoad={safeRoad}
            startPos={startPos}
            mapCenter={[20.0085, 73.7935]}
            namePrefix="Regional"
            rows={8}
            cols={8}
        />
    );
}

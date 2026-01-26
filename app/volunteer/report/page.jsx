"use client";

import dynamic from "next/dynamic";

const CrowdReporterAI = dynamic(
    () => import("../../../app/components/CrowdReporterAI"),
    { ssr: false }
);

export default function VolunteerReportPage() {
    return (
        <main className="w-full h-screen bg-black">
            <CrowdReporterAI />
        </main>
    );
}

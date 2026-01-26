import { NextResponse } from "next/server";
import { sectorCrowd } from "../../location/store";

// Save a manual report
export async function POST(req) {
    try {
        const { sectionId, level } = await req.json();
        if (sectionId) {
            sectorCrowd[sectionId] = level;
        }
        console.log("Sector Map Updated:", sectorCrowd);
        return NextResponse.json({ success: true, current: sectorCrowd });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
}

// Get all reports for other users to see
export async function GET() {
    return NextResponse.json(sectorCrowd);
}

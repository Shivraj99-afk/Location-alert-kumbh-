import { settings } from "../store";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { limit } = await req.json();
        if (typeof limit === 'number') {
            settings.crowdLimit = limit;
            return NextResponse.json({ success: true, limit: settings.crowdLimit });
        }
        return NextResponse.json({ success: false, error: "Invalid limit" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ limit: settings.crowdLimit });
}

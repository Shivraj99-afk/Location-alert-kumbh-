import { users, settings, reservations } from "../store";
import { NextResponse } from "next/server";
import { LAT_STEP, LNG_STEP, getCellId, getSafestPath } from "@/lib/grid";

function distance(a, b) {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * Math.PI / 180) *
        Math.cos(b.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const lat = parseFloat(searchParams.get("lat"));
    const lng = parseFloat(searchParams.get("lng"));
    const forceSafePath = searchParams.get("forceSafePath") === "true";
    const targetLat = parseFloat(searchParams.get("targetLat"));
    const targetLng = parseFloat(searchParams.get("targetLng"));

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }

    const now = Date.now();
    const gridCrowd = {};

    // 1. INJECT DUMMY CROWD DATA (Testing Simulation)
    // Dynamic injection based on user region
    if (lat > 19.97 && lat < 19.98) {
        // Global Simulation Test Area
        const dummyCells = ["44384,147488", "44384,147489", "44385,147488", "44385,147489"];
        dummyCells.forEach(id => { gridCrowd[id] = settings.crowdLimit + 5; });
    } else if (lat > 19.96 && lat < 19.97) {
        // Nashik-B Simulation Area
        // Injecting a cluster around [19.964, 73.668]
        const nashikDummies = ["44364,147336", "44364,147337", "44365,147336", "44365,147337"];
        nashikDummies.forEach(id => { gridCrowd[id] = settings.crowdLimit + 5; });
    }

    // 2. Process real users
    const nearby = [];
    for (const [id, u] of users) {
        if (now - u.time > 30000) {
            users.delete(id);
            continue;
        }
        const cellId = getCellId(u.lat, u.lng);
        gridCrowd[cellId] = (gridCrowd[cellId] || 0) + 1;

        if (id !== userId) {
            if (distance({ lat, lng }, u) <= 500) {
                nearby.push({ id, lat: u.lat, lng: u.lng });
            }
        }
    }

    // 3. Logic for recommendation (Standard Safe-Path Logic)
    const myCell = getCellId(lat, lng);
    const cellUsers = Array.from(users.entries())
        .filter(([_, u]) => getCellId(u.lat, u.lng) === myCell)
        .sort((a, b) => a[1].joinTime - b[1].joinTime);

    const myRank = cellUsers.findIndex(([id, _]) => id === userId) + 1;
    const isCrowded = (gridCrowd[myCell] || 0) > settings.crowdLimit;

    let recommendation = null;
    const gridSnippet = [];
    const myRLat = Math.floor(lat / LAT_STEP);
    const myRLng = Math.floor(lng / LNG_STEP);

    // Increased snippet size for wide safety detours (21x21)
    for (let dr = -10; dr <= 10; dr++) {
        for (let dc = -10; dc <= 10; dc++) {
            const r = myRLat + dr;
            const c = myRLng + dc;
            const id = `${r},${c}`;
            gridSnippet.push({
                id,
                lat: r * LAT_STEP,
                lng: c * LNG_STEP,
                count: gridCrowd[id] || 0,
                isMe: id === myCell
            });
        }
    }

    if ((isCrowded && myRank > settings.crowdLimit) || forceSafePath) {
        // Check for sticky
        const myKey = Array.from(reservations.keys()).find(k => k.startsWith(`${userId}:`));
        if (myKey) {
            const rid = myKey.split(":")[1];
            const rCell = gridSnippet.find(c => c.id === rid);
            if (rCell && rCell.count < settings.crowdLimit) {
                recommendation = rCell;
                reservations.set(myKey, now);
            }
        }

        if (!recommendation) {
            const candidates = gridSnippet
                .filter(cell => cell.id !== myCell && cell.count < settings.crowdLimit)
                .sort((a, b) => {
                    const loadA = a.count + Array.from(reservations.keys()).filter(k => k.endsWith(a.id)).length;
                    const loadB = b.count + Array.from(reservations.keys()).filter(k => k.endsWith(b.id)).length;
                    return loadA - loadB;
                });

            if (candidates.length > 0) {
                recommendation = candidates[0];
                for (const k of reservations.keys()) if (k.startsWith(`${userId}:`)) reservations.delete(k);
                reservations.set(`${userId}:${recommendation.id}`, now);
            }
        }
    }

    // 4. Calculate safest path
    let safestPath = null;

    // Determine target: manual target takes priority, then recommendation
    let target = null;
    if (!isNaN(targetLat) && !isNaN(targetLng)) {
        target = { lat: targetLat, lng: targetLng };
    } else if (recommendation) {
        target = { lat: recommendation.lat + LAT_STEP / 2, lng: recommendation.lng + LNG_STEP / 2 };
    }

    if (target) {
        const densityMap = {};
        gridSnippet.forEach(cell => densityMap[cell.id] = cell.count);

        try {
            safestPath = getSafestPath(
                { lat, lng },
                target,
                densityMap,
                settings.crowdLimit
            );
        } catch (error) {
            console.error("Error calculating safest path:", error);
        }
    }

    return NextResponse.json({
        nearby,
        myRank: myRank || 1,
        myCell,
        gridCrowd: gridSnippet,
        alert: isCrowded && myRank > settings.crowdLimit,
        recommendation,
        safestPath,
        crowdLimit: settings.crowdLimit
    });
}
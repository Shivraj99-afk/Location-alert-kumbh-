// Shared constants
export const LAT_STEP = 0.00045; // ~50m
export const LNG_STEP = 0.0005;  // ~50m

export function getCellId(lat, lng) {
    const rLat = Math.floor(lat / LAT_STEP);
    const rLng = Math.floor(lng / LNG_STEP);
    return `${rLat},${rLng}`;
}

/**
 * SAFETY-FIRST PATHFINDING
 * - Red zones are BLOCKED
 * - No diagonals
 * - Green preferred
 * - Yellow avoided
 */
export function getSafestPath(start, end, densityMap, limit = 2) {
    const startId = getCellId(start.lat, start.lng);
    const endId = getCellId(end.lat, end.lng);

    if (startId === endId) {
        return [[start.lat, start.lng], [end.lat, end.lng]];
    }

    // 4-direction movement only
    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];

    const openSet = new Set([startId]);
    const cameFrom = new Map();

    const gScore = new Map();
    const fScore = new Map();

    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, endId));

    const MAX_ITERS = 4000;
    let iter = 0;

    while (openSet.size > 0 && iter < MAX_ITERS) {
        iter++;

        // get node with lowest fScore
        let current = null;
        let best = Infinity;

        for (const id of openSet) {
            const f = fScore.get(id) ?? Infinity;
            if (f < best) {
                best = f;
                current = id;
            }
        }

        if (!current) break;

        if (current === endId) {
            return reconstructPath(cameFrom, current, start, end);
        }

        openSet.delete(current);

        const [r, c] = current.split(",").map(Number);

        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            const neighborId = `${nr},${nc}`;

            const count =
                densityMap[neighborId] === undefined
                    ? -1
                    : densityMap[neighborId];

            // ❌ HARD BLOCK RED CELLS
            if (count >= limit) continue;

            let penalty = 1;

            if (count > 0) penalty = 80;     // yellow
            if (count === -1) penalty = 10;  // unknown

            const tentativeG =
                (gScore.get(current) ?? Infinity) + penalty;

            if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
                cameFrom.set(neighborId, current);
                gScore.set(neighborId, tentativeG);

                const h = heuristic(neighborId, endId);
                fScore.set(neighborId, tentativeG + h);

                openSet.add(neighborId);
            }
        }
    }

    console.warn("Safest path not found, fallback to straight line");
    return [[start.lat, start.lng], [end.lat, end.lng]];
}

/**
 * Distance in grid space
 */
function heuristic(a, b) {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return Math.abs(ar - br) + Math.abs(ac - bc);
}

/**
 * Convert cell path → lat/lng path
 */
function reconstructPath(cameFrom, current, start, end) {
    const path = [];

    while (current) {
        const [r, c] = current.split(",").map(Number);
        path.unshift([
            r * LAT_STEP + LAT_STEP / 2,
            c * LNG_STEP + LNG_STEP / 2,
        ]);
        current = cameFrom.get(current);
    }

    path[0] = [start.lat, start.lng];
    path[path.length - 1] = [end.lat, end.lng];

    return path;
}

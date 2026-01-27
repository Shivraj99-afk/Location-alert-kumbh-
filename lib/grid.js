/**
 * GRID CONFIGURATION
 * These steps define the precision of our 'Sector' tracking.
 * Lat: 0.00045 ≈ 50 meters
 * Lng: 0.0005 ≈ 50 meters
 */
export const LAT_STEP = 0.00045;
export const LNG_STEP = 0.0005;

/**
 * Get a unique string identifier for a specific coordinate's grid cell
 */
export function getCellId(lat, lng) {
    const rLat = Math.floor(lat / LAT_STEP);
    const rLng = Math.floor(lng / LNG_STEP);
    return `${rLat},${rLng}`;
}

/**
 * A* PATHFINDING ALGORITHM
 * Calculates the safest route avoiding high-density crowd zones.
 */
export function getSafestPath(start, end, densityMap, limit = 5) {
    const startId = getCellId(start.lat, start.lng);
    const endId = getCellId(end.lat, end.lng);

    if (startId === endId) {
        return [[start.lat, start.lng], [end.lat, end.lng]];
    }

    // Allowed directions: Up, Down, Left, Right
    const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    const openSet = new Set([startId]);
    const cameFrom = new Map();

    const gScore = new Map(); // Cost from start to current
    const fScore = new Map(); // Estimated total cost (g + heuristic)

    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, endId));

    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Find node in openSet with lowest fScore
        let currentId = null;
        let minF = Infinity;
        for (const id of openSet) {
            const f = fScore.get(id) ?? Infinity;
            if (f < minF) {
                minF = f;
                currentId = id;
            }
        }

        if (!currentId) break;
        if (currentId === endId) {
            return reconstructPath(cameFrom, currentId, start, end);
        }

        openSet.delete(currentId);
        const [r, c] = currentId.split(",").map(Number);

        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            const neighborId = `${nr},${nc}`;

            // Calculate cost to move to this neighbor
            const crowdCount = densityMap[neighborId] || 0;

            // FATAL BLOCK: If crowd exceeds limit, it's a 'wall'
            if (crowdCount >= limit) continue;

            // Penalties: 
            // 0 users = 1 (Green)
            // 1-limit users = 20 (Yellow/Warning)
            const penalty = crowdCount > 0 ? 25 : 1;
            const tentativeG = (gScore.get(currentId) ?? Infinity) + penalty;

            if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
                cameFrom.set(neighborId, currentId);
                gScore.set(neighborId, tentativeG);
                fScore.set(neighborId, tentativeG + heuristic(neighborId, endId));
                openSet.add(neighborId);
            }
        }
    }

    // Fallback if no path found within calculation limit
    console.log("No safe path found within limits, using direct vector.");
    return [[start.lat, start.lng], [end.lat, end.lng]];
}

/**
 * Simple Manhattan Distance heuristic for the grid
 */
function heuristic(a, b) {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return Math.abs(ar - br) + Math.abs(ac - bc);
}

/**
 * Converts the Map of parents back into a list of [lat, lng] coordinates
 */
function reconstructPath(cameFrom, currentId, start, end) {
    const path = [];
    let tempId = currentId;

    while (tempId) {
        const [r, c] = tempId.split(",").map(Number);
        path.unshift([
            r * LAT_STEP + LAT_STEP / 2,
            c * LNG_STEP + LNG_STEP / 2
        ]);
        tempId = cameFrom.get(tempId);
    }

    // Ensure high-fidelity start/end points
    path[0] = [start.lat, start.lng];
    path[path.length - 1] = [end.lat, end.lng];

    return path;
}

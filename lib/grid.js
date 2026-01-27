// Shared constants for the dynamic grid system
export const LAT_STEP = 0.00045; // ~50m
export const LNG_STEP = 0.0005;  // ~50m

export function getCellId(lat, lng) {
    const rLat = Math.floor(lat / LAT_STEP);
    const rLng = Math.floor(lng / LNG_STEP);
    return `${rLat},${rLng}`;
}

/**
 * A* Pathfinding to find the "Safest" path through sectors.
 * @param {Object} start {lat, lng}
 * @param {Object} end {lat, lng}
 * @param {Object} densityMap { "r,c": count }
 * @param {Number} limit Crowd limit for red zones
 */
export function getSafestPath(start, end, densityMap, limit = 2) {
    const startId = getCellId(start.lat, start.lng);
    const endId = getCellId(end.lat, end.lng);

    if (startId === endId) return [[start.lat, start.lng], [end.lat, end.lng]];

    const openSet = [startId];
    const cameFrom = new Map();
    const gScore = new Map(); // Cost from start to current node
    const fScore = new Map(); // Estimated total cost (gScore + heuristic)

    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, endId));

    const maxIterations = 200; // Limit for safety
    let iterations = 0;

    while (openSet.length > 0 && iterations < maxIterations) {
        iterations++;
        // Sort to get node with lowest fScore
        openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
        const current = openSet.shift();

        if (current === endId) {
            return reconstructPath(cameFrom, current);
        }

        const [currLat, currLng] = current.split(",").map(Number);

        // 8 Neighbors (include diagonals)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const neighborId = `${currLat + dr},${currLng + dc}`;
                const count = densityMap[neighborId] || 0;

                // COST LOGIC (Safety First):
                // Green (0): 1
                // Medium (>0 && <limit): 50
                // Red (>=limit): 1000
                let penalty = 1;
                if (count >= limit) penalty = 1000;
                else if (count > 0) penalty = 50;

                // Diagonals cost slightly more (sqrt(2))
                const stepDist = (dr !== 0 && dc !== 0) ? 1.414 : 1;
                const tentativeGScore = gScore.get(current) + (stepDist * penalty);

                if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
                    cameFrom.set(neighborId, current);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + heuristic(neighborId, endId));
                    if (!openSet.includes(neighborId)) openSet.push(neighborId);
                }
            }
        }
    }

    return null; // No path found
}

function heuristic(a, b) {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return Math.sqrt((ar - br) ** 2 + (ac - bc) ** 2);
}

function reconstructPath(cameFrom, current) {
    const totalPath = [];
    while (current) {
        const [r, c] = current.split(",").map(Number);
        totalPath.unshift([r * LAT_STEP + LAT_STEP / 2, c * LNG_STEP + LNG_STEP / 2]);
        current = cameFrom.get(current);
    }
    return totalPath;
}

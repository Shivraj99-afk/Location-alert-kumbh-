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
 * This prioritizes avoiding red zones (high crowd density) while finding a path to the destination.
 * @param {Object} start {lat, lng}
 * @param {Object} end {lat, lng}
 * @param {Object} densityMap { "r,c": count }
 * @param {Number} limit Crowd limit for red zones
 */
export function getSafestPath(start, end, densityMap, limit = 2) {
    const startId = getCellId(start.lat, start.lng);
    const endId = getCellId(end.lat, end.lng);

    // If start and end are in the same cell, return direct path
    if (startId === endId) {
        return [[start.lat, start.lng], [end.lat, end.lng]];
    }

    const openSet = [startId];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map(); // Cost from start to current node
    const fScore = new Map(); // Estimated total cost (gScore + heuristic)

    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, endId));

    const maxIterations = 500; // Increased limit for complex paths
    let iterations = 0;

    while (openSet.length > 0 && iterations < maxIterations) {
        iterations++;
        
        // Sort to get node with lowest fScore
        openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
        const current = openSet.shift();

        // Reached destination
        if (current === endId) {
            return reconstructPath(cameFrom, current, start, end);
        }

        closedSet.add(current);

        const [currLat, currLng] = current.split(",").map(Number);

        // Explore 8 neighbors (including diagonals)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const neighborId = `${currLat + dr},${currLng + dc}`;
                
                // Skip if already evaluated
                if (closedSet.has(neighborId)) continue;

                const count = densityMap[neighborId] || 0;

                // COST LOGIC (Safety First):
                // Green (0): 1 (preferred)
                // Medium (>0 && <limit): 50 (avoid if possible)
                // Red (>=limit): 1000 (strongly avoid)
                let penalty = 1;
                if (count >= limit) {
                    penalty = 1000; // Very high cost for red zones
                } else if (count > 0) {
                    penalty = 50; // Moderate cost for yellow zones
                }

                // Diagonals cost slightly more (sqrt(2) ≈ 1.414)
                const stepDist = (dr !== 0 && dc !== 0) ? 1.414 : 1;
                const tentativeGScore = (gScore.get(current) || Infinity) + (stepDist * penalty);

                if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
                    // This path to neighbor is better
                    cameFrom.set(neighborId, current);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + heuristic(neighborId, endId));
                    
                    if (!openSet.includes(neighborId)) {
                        openSet.push(neighborId);
                    }
                }
            }
        }
    }

    // No path found - return direct line as fallback
    console.warn("No safe path found, returning direct route");
    return [[start.lat, start.lng], [end.lat, end.lng]];
}

/**
 * Heuristic function for A* (Euclidean distance in grid coordinates)
 */
function heuristic(a, b) {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return Math.sqrt((ar - br) ** 2 + (ac - bc) ** 2);
}

/**
 * Reconstruct the path from the cameFrom map
 */
function reconstructPath(cameFrom, current, start, end) {
    const totalPath = [];
    
    // Walk backwards through the path
    while (current) {
        const [r, c] = current.split(",").map(Number);
        // Use center of each cell
        totalPath.unshift([r * LAT_STEP + LAT_STEP / 2, c * LNG_STEP + LNG_STEP / 2]);
        current = cameFrom.get(current);
    }
    
    // Add exact start and end points
    if (totalPath.length > 0) {
        totalPath[0] = [start.lat, start.lng];
        totalPath[totalPath.length - 1] = [end.lat, end.lng];
    }
    
    return totalPath;
}
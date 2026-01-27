export const users = new Map();
export const sectorCrowd = {}; // Shared manual reports for the Sector Map

export const settings = {
    crowdLimit: 2, // Default limit
};

// Track how many people we've assigned to a specific cell in the last sync window
// This helps with distributing paths
export const reservations = new Map();

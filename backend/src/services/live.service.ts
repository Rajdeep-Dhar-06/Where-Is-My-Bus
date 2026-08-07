import { LiveState, type BusState } from '../state/live.state';

export const LiveService = {

    // Step 2: Get all active buses on a specific route (reads from RAM)
    // Optional stationId filters and sorts buses relative to that station
    getActiveBusesOnRoute: (routeId: string, stationId?: string) => {
        const buses = LiveState.getBusesOnRoute(routeId);

        if (!stationId) {
            return buses;
        }

        const cachedRoute = LiveState.routeCache.get(routeId);
        if (!cachedRoute) {
            // If the route has no active buses, it might not be cached yet.
            // Return empty array instead of crashing.
            return [];
        }

        const stationStop = cachedRoute.stops.find(s => s.stationId === stationId);
        if (!stationStop) {
            throw new Error(`Station ${stationId} not found on route ${routeId}`);
        }

        const enrichedBuses = buses.map(bus => {
            const distanceRemaining = cachedRoute.cumulativeDistances[stationStop.geometryIndex] - cachedRoute.cumulativeDistances[bus.currentIndex];
            
            // If bus has passed the station, distance Remaining is <= 0
            if (distanceRemaining <= 0) {
                return null;
            }

            let etaMinutes: number | null = null;
            if (bus.status === 'MOVING' && bus.speed > 0) {
                etaMinutes = Math.round(((distanceRemaining / 1000) / bus.speed) * 60);
            }

            return {
                ...bus,
                distanceRemaining,
                etaMinutes
            };
        }).filter(Boolean) as (BusState & { distanceRemaining: number, etaMinutes: number | null })[];

        // Sort by etaMinutes ascending. Nulls at the bottom.
        enrichedBuses.sort((a, b) => {
            if (a.etaMinutes === null && b.etaMinutes === null) return 0;
            if (a.etaMinutes === null) return 1;
            if (b.etaMinutes === null) return -1;
            return a.etaMinutes - b.etaMinutes;
        });

        return enrichedBuses;
    },

    // Step 3: Get a single bus's current state (for initial load of tracking page)
    getBusState: (busId: string): BusState | undefined => {
        return LiveState.activeBuses.get(busId);
    }
};
import type { Feature, LineString } from 'geojson';

export interface BusState {
    busId: string;
    routeId: string;
    vehiclePlate: string;
    currentIndex: number;
    snappedLocation: [number, number];
    speed: number;
    lastPingTime: number;
    tripStartedAt: number;
}

class LiveStateStore {
    // K: busId -> V: BusState
    public activeBuses = new Map<string, BusState>();

    // K: routeId -> V: Turf Feature<LineString>
    // We cache the heavy geometry here so the physics engine never waits on MongoDB
    public routeCache = new Map<string, Feature<LineString>>();

    // Helper: Remove a bus from the active state
    public removeBus(busId: string) {
        this.activeBuses.delete(busId);
    }

    // Helper: Get all active buses on a specific route
    public getBusesOnRoute(routeId: string): BusState[] {
        return Array.from(this.activeBuses.values())
            .filter(bus => bus.routeId === routeId);
    }
}

// Export as a Singleton so the entire Node app shares the exact same memory instance
export const LiveState = new LiveStateStore();
import { LiveState, type BusState } from '../state/live.state';

export const LiveService = {

    // Step 2: Get all active buses on a specific route (reads from RAM)
    getActiveBusesOnRoute: (routeId: string): BusState[] => {
        return LiveState.getBusesOnRoute(routeId);
    },

    // Step 3: Get a single bus's current state (for initial load of tracking page)
    getBusState: (busId: string): BusState | undefined => {
        return LiveState.activeBuses.get(busId);
    }
};
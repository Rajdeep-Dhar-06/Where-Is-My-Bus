import { Station } from '../models/station.model';
import { Route } from '../models/route.model';
import { OsrmService } from './osrm.service';

export const RouteService = {

    // 1. ADMIN: Create a brand new route
    buildAndSaveRoute: async (routeName: string, stationIds: string[]) => {
        // A. Fetch raw stations
        const stations = await Station.find({ _id: { $in: stationIds } });

        // B. Enforce Strict Ordering
        const orderedStations = stationIds.map(id => {
            const station = stations.find(s => s._id.toString() === id);
            if (!station) throw new Error(`Station ID ${id} not found in database.`);
            return station;
        });

        // C. Extract Coordinates Array
        const stationCoordinates = orderedStations.map(s => s.location.coordinates as [number, number]);

        // D. Trigger the OSRM Engine (Pure Math Execution)
        const osrmData = await OsrmService.fetchRouteGeometry(stationCoordinates);

        // E. Map the OSRM array indices to the MongoDB schema
        const routeStops = orderedStations.map((station, index) => ({
            stationId: station._id,
            order: index + 1,
            geometryIndex: osrmData.stationGeometryIndices[index],
            // The last stop has a distanceToNext of 0
            distanceToNext: index === orderedStations.length - 1 ? 0 : osrmData.distancesBetweenStops[index]
        }));

        // F. Assemble and Save
        const newRoute = new Route({
            routeName,
            isActive: true,
            stops: routeStops,
            geometry: osrmData.geometry,
            cumulativeDistances: osrmData.cumulativeDistances
        });

        await newRoute.save();
        return newRoute;
    },

    // 2. ADMIN: List all routes for the dashboard
    fetchAllRoutes: async (isActiveFilter?: string) => {
        const query = isActiveFilter !== undefined ? { isActive: isActiveFilter === 'true' } : {};

        return await Route.find(query)
            .select('routeName isActive stops createdAt') // Exclude massive geometry arrays for table views
            .lean();
    },

    // 3. ADMIN / PASSENGER: Get full polyline and populated station names
    fetchRouteDetails: async (routeId: string) => {
        const route = await Route.findById(routeId)
            .populate('stops.stationId', 'stationName location')
            .lean();

        if (!route) throw new Error('Route not found');
        return route;
    },

    // 4. ADMIN: Soft delete or reactivate
    toggleRouteStatus: async (routeId: string, isActive: boolean) => {
        const updatedRoute = await Route.findByIdAndUpdate(
            routeId,
            { isActive },
            { new: true }
        ).select('routeName isActive');

        if (!updatedRoute) throw new Error('Route not found');
        return updatedRoute;
    },

    // 5. ADMIN: Completely rebuild a route's physical path
    rebuildRoute: async (routeId: string, routeName: string, stationIds: string[]) => {
        const stations = await Station.find({ _id: { $in: stationIds } });

        const orderedStations = stationIds.map(id => {
            const station = stations.find(s => s._id.toString() === id);
            if (!station) throw new Error(`Station ID ${id} not found.`);
            return station;
        });

        const stationCoordinates = orderedStations.map(s => s.location.coordinates as [number, number]);

        // Re-trigger OSRM to generate entirely new geometry and prefix sum arrays
        const osrmData = await OsrmService.fetchRouteGeometry(stationCoordinates);

        const routeStops = orderedStations.map((station, index) => ({
            stationId: station._id,
            order: index + 1,
            geometryIndex: osrmData.stationGeometryIndices[index],
            distanceToNext: index === orderedStations.length - 1 ? 0 : osrmData.distancesBetweenStops[index]
        }));

        const updatedRoute = await Route.findByIdAndUpdate(
            routeId,
            {
                routeName,
                stops: routeStops,
                geometry: osrmData.geometry,
                cumulativeDistances: osrmData.cumulativeDistances
            },
            { new: true }
        );

        if (!updatedRoute) throw new Error('Route not found to update');
        return updatedRoute;
    },

    // 6. PASSENGER: The Search Engine (Find paths between Station A and Station B)
    findRoutesBetweenStations: async (startStationId: string, endStationId: string) => {
        // A. Database Level Filtering ($all operator + Compound Index)
        const potentialRoutes = await Route.find({
            isActive: true,
            'stops.stationId': { $all: [startStationId, endStationId] }
        })
            .select('routeName stops')
            .lean();

        // B. Directionality Check in Node.js Memory
        const validRoutes = potentialRoutes.filter(route => {
            const startStop = route.stops.find(s => s.stationId.toString() === startStationId);
            const endStop = route.stops.find(s => s.stationId.toString() === endStationId);

            return startStop && endStop && startStop.order < endStop.order;
        });

        // C. Return pure route metadata (live bus data is fetched separately via GET /api/routes/:id/buses)
        return validRoutes.map(route => ({
            routeId: route._id,
            routeName: route.routeName,
            stops: route.stops
        }));
    }
};
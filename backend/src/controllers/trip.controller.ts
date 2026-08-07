import type { Request, Response } from 'express';
import { Vehicle } from '../models/vehicle.model';
import { Route } from '../models/route.model';
import { LiveState } from '../state/live.state';
import { getIO } from '../sockets/io.singleton';

export const startTrip = async (req: Request, res: Response): Promise<void> => {
    const { vehicleId, routeId, socketId } = req.body;

    // 1. Validate Socket Connection
    const io = getIO();
    const driverSocket = io.sockets.sockets.get(socketId);
    
    if (!driverSocket) {
        res.status(400).json({ success: false, message: 'Driver socket not connected. Please connect WebSocket first.' });
        return;
    }

    // 2. Fetch Vehicle for plate number
    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) {
        res.status(404).json({ success: false, message: 'Vehicle not found' });
        return;
    }

    // 3. Fetch Route and Cache it if not already cached
    if (!LiveState.routeCache.has(routeId)) {
        const route = await Route.findById(routeId).populate('stops.stationId', 'stationName').lean();
        if (!route) {
            res.status(404).json({ success: false, message: 'Route not found' });
            return;
        }

        // Map stops for cache
        const stops = route.stops.map((stop: any, index: number) => ({
            stationId: stop.stationId._id.toString(),
            stationName: stop.stationId.stationName,
            order: index,
            geometryIndex: stop.geometryIndex
        }));

        // We only need the dense geometry line for snapping
        const line = {
            type: 'Feature' as const,
            properties: {},
            geometry: route.geometry as any // Assuming Route geometry matches GeoJSON LineString
        };

        LiveState.routeCache.set(routeId, {
            line,
            stops,
            cumulativeDistances: route.cumulativeDistances
        });
    }

    // 4. Stamp Socket Identity
    driverSocket.data.busId = vehicleId;
    driverSocket.data.routeId = routeId;

    // 5. Initialize Live State
    LiveState.activeBuses.set(vehicleId, {
        busId: vehicleId,
        routeId: routeId,
        vehiclePlate: vehicle.plateNumber,
        currentIndex: 0,
        snappedLocation: LiveState.routeCache.get(routeId)!.line.geometry.coordinates[0] as [number, number],
        speed: 0,
        lastPingTime: Date.now(),
        tripStartedAt: Date.now(),
        status: 'STOPPED',
        lowSpeedPingCount: 0
    });

    // 6. Return commanded ping interval
    res.status(200).json({
        success: true,
        pingIntervalMs: 5000
    });
};

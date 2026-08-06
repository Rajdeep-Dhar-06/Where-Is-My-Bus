import { Server, Socket } from 'socket.io';
import * as turf from '@turf/turf';
import { LiveState } from '../state/live.state';
import { Route } from '../models/route.model';
import { Vehicle } from '../models/vehicle.model';

export const registerDriverHandlers = (io: Server, socket: Socket) => {

    // 1. Start Trip — Cache geometry, write initial state, notify summary room
    socket.on('driver:start_trip', async (data: { vehicleId: string, routeId: string }) => {
        const { vehicleId, routeId } = data;

        try {
            // Fetch vehicle plate for display on passenger screens
            const vehicle = await Vehicle.findById(vehicleId).select('plateNumber').lean();
            if (!vehicle) throw new Error('Vehicle not found');

            // Check memory cache before querying MongoDB for geometry
            let cachedLine = LiveState.routeCache.get(routeId);
            if (!cachedLine) {
                const route = await Route.findById(routeId).select('geometry').lean();
                if (!route) throw new Error('Route not found');

                cachedLine = turf.lineString(route.geometry.coordinates as [number, number][]);
                LiveState.routeCache.set(routeId, cachedLine);
            }

            // Use route's first coordinate as initial position until first GPS ping arrives
            const firstCoord = cachedLine.geometry.coordinates[0] as [number, number];

            // Write initial state to RAM
            const busState = {
                busId: vehicleId,
                routeId,
                vehiclePlate: vehicle.plateNumber,
                currentIndex: 0,
                snappedLocation: firstCoord,
                speed: 0,
                lastPingTime: Date.now(),
                tripStartedAt: Date.now()
            };
            LiveState.activeBuses.set(vehicleId, busState);

            socket.join(`route:${routeId}:drivers`);

            // Persist metadata on socket for disconnect tracking
            socket.data.busId = vehicleId;
            socket.data.routeId = routeId;

            console.log(`🚌 Bus ${vehicle.plateNumber} started trip on Route ${routeId}`);
            socket.emit('trip:started', { success: true });

            // Notify passengers on the Active Buses page (Step 2 summary room)
            io.to(`route:${routeId}:summary`).emit('route:bus_joined', {
                busId: vehicleId,
                vehiclePlate: vehicle.plateNumber,
                currentIndex: 0,
                snappedLocation: firstCoord,
                tripStartedAt: busState.tripStartedAt
            });

        } catch (error) {
            console.error('Failed to start trip:', error);
            socket.emit('trip:error', { message: 'Failed to initialize route data' });
        }
    });

    // 2. GPS Ping — Snap to road, calculate speed, broadcast to Step 3 room
    socket.on('driver:ping', (data: { busId: string, routeId: string, location: [number, number] }) => {
        const { busId, routeId, location } = data;

        const cachedLine = LiveState.routeCache.get(routeId);
        if (!cachedLine) return; // Prevent crashes if a ping arrives before start_trip resolves

        // Turf.js geometry snapping
        const rawPoint = turf.point(location);
        const snapped = turf.nearestPointOnLine(cachedLine, rawPoint);
        const snappedIndex = snapped.properties.index ?? 0;
        const snappedCoords = snapped.geometry.coordinates as [number, number];

        // Calculate live speed from consecutive pings
        const existingState = LiveState.activeBuses.get(busId);
        let speed = 0;

        if (existingState) {
            const timeDeltaMs = Date.now() - existingState.lastPingTime;

            // Only calculate if we have a meaningful time gap (> 1 second) to avoid division spikes
            if (timeDeltaMs > 1000) {
                const distanceKm = turf.distance(
                    turf.point(existingState.snappedLocation),
                    turf.point(snappedCoords),
                    { units: 'kilometers' }
                );
                const timeDeltaHours = timeDeltaMs / 3_600_000;
                speed = Math.round((distanceKm / timeDeltaHours) * 10) / 10; // 1 decimal place
            }

            // Mutate existing state in RAM (avoids creating new objects every 3 seconds)
            existingState.currentIndex = snappedIndex;
            existingState.snappedLocation = snappedCoords;
            existingState.speed = speed;
            existingState.lastPingTime = Date.now();
        }

        // Broadcast to Step 3 room — only passengers tracking THIS specific bus
        io.to(`bus:${busId}:live`).emit('bus:location', {
            busId,
            currentIndex: snappedIndex,
            snappedLocation: snappedCoords,
            speed
        });
    });

    // 3. End Trip (explicit driver action)
    socket.on('driver:end_trip', () => {
        const { busId, routeId } = socket.data;
        if (busId) {
            LiveState.removeBus(busId);

            // Notify Step 2 passengers (Active Buses list)
            io.to(`route:${routeId}:summary`).emit('route:bus_left', { busId });

            // Notify Step 3 passengers (anyone currently tracking this bus)
            io.to(`bus:${busId}:live`).emit('bus:offline', { busId });

            console.log(`🛑 Bus ${busId} ended trip on Route ${routeId}`);
        }
    });

    // 4. Disconnect Handling (Ghost Bus Purge)
    socket.on('disconnect', () => {
        const { busId, routeId } = socket.data;
        if (busId) {
            console.log(`⚠️ Bus ${busId} disconnected. Awaiting 30s timeout...`);

            setTimeout(() => {
                const bus = LiveState.activeBuses.get(busId);
                // Only drop if the ping time is actually stale (prevents dropping reconnected buses)
                if (bus && (Date.now() - bus.lastPingTime) > 29000) {
                    LiveState.removeBus(busId);

                    io.to(`route:${routeId}:summary`).emit('route:bus_left', { busId });
                    io.to(`bus:${busId}:live`).emit('bus:offline', { busId });

                    console.log(`💀 Bus ${busId} dropped from RAM.`);
                }
            }, 30000);
        }
    });
};
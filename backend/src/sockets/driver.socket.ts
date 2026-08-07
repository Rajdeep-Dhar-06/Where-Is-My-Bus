import { Server, Socket } from 'socket.io';
import * as turf from '@turf/turf';
import { LiveState } from '../state/live.state';

const STUCK_PING_THRESHOLD = 5;
const LOW_SPEED_THRESHOLD_KMH = 5;

export const registerDriverHandlers = (io: Server, socket: Socket) => {

    // 1. GPS Ping — Snap to road, calculate speed/status, broadcast to Step 3 room
    socket.on('driver:ping', (data: { location: [number, number] }) => {
        const { busId, routeId } = socket.data;
        if (!busId || !routeId) return; // Ignore pings from uninitialized sockets

        const { location } = data;

        const cachedRoute = LiveState.routeCache.get(routeId);
        if (!cachedRoute) return; // Prevent crashes if a ping arrives before route is cached

        const cachedLine = cachedRoute.line;

        // Turf.js geometry snapping
        const rawPoint = turf.point(location);
        const snapped = turf.nearestPointOnLine(cachedLine, rawPoint);
        const snappedIndex = snapped.properties.index ?? 0;
        const snappedCoords = snapped.geometry.coordinates as [number, number];

        // Calculate live speed from consecutive pings
        const existingState = LiveState.activeBuses.get(busId);
        if (!existingState) return;

        let speed = 0;
        let newStatus = existingState.status;
        let newPingCount = existingState.lowSpeedPingCount;

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

            // Decision 11: Bus Status Heuristics
            if (speed > LOW_SPEED_THRESHOLD_KMH) {
                newStatus = 'MOVING';
                newPingCount = 0;
            } else {
                newPingCount += 1;
                if (newPingCount >= STUCK_PING_THRESHOLD) {
                    newStatus = 'STUCK';
                } else {
                    newStatus = 'STOPPED';
                }
            }
        }

        // Mutate existing state in RAM (avoids creating new objects every ping)
        existingState.currentIndex = snappedIndex;
        existingState.snappedLocation = snappedCoords;
        existingState.speed = speed;
        existingState.lastPingTime = Date.now();
        existingState.status = newStatus;
        existingState.lowSpeedPingCount = newPingCount;

        // Decision 8: Enriched bus:location Payload (Station Timeline)
        const timeline = [];
        let nextStopFound = false;
        
        for (const stop of cachedRoute.stops) {
            const passed = snappedIndex >= stop.geometryIndex;
            let distanceRemaining = 0;
            let etaMinutes: number | null = null;
            let isNext = false;
            
            if (!passed) {
                distanceRemaining = cachedRoute.cumulativeDistances[stop.geometryIndex] - cachedRoute.cumulativeDistances[snappedIndex];
                
                if (!nextStopFound) {
                    isNext = true;
                    nextStopFound = true;
                }
                
                if (speed > 0 && newStatus === 'MOVING') {
                    // etaMinutes = (distance in km) / (speed in km/h) * 60 min/h
                    etaMinutes = Math.round(((distanceRemaining / 1000) / speed) * 60);
                }
            }

            timeline.push({
                stationId: stop.stationId,
                stationName: stop.stationName,
                passed,
                distanceRemaining,
                etaMinutes,
                isNext
            });
        }

        // Broadcast to Step 3 room — only passengers tracking THIS specific bus
        io.to(`bus:${busId}:live`).emit('bus:location', {
            busId,
            currentIndex: snappedIndex,
            snappedLocation: snappedCoords,
            speed,
            status: newStatus,
            timeline
        });
    });

    // 2. End Trip (explicit driver action)
    socket.on('driver:end_trip', () => {
        const { busId, routeId } = socket.data;
        if (busId) {
            LiveState.removeBus(busId);

            // Notify Step 3 passengers (anyone currently tracking this bus)
            io.to(`bus:${busId}:live`).emit('bus:offline', { busId });

            console.log(`🛑 Bus ${busId} ended trip on Route ${routeId}`);
        }
    });

    // 3. Disconnect Handling (Ghost Bus Purge)
    socket.on('disconnect', () => {
        const { busId, routeId } = socket.data;
        if (busId) {
            console.log(`⚠️ Bus ${busId} disconnected. Awaiting 30s timeout...`);

            setTimeout(() => {
                const bus = LiveState.activeBuses.get(busId);
                // Only drop if the ping time is actually stale (prevents dropping reconnected buses)
                if (bus && (Date.now() - bus.lastPingTime) > 29000) {
                    LiveState.removeBus(busId);

                    io.to(`bus:${busId}:live`).emit('bus:offline', { busId });

                    console.log(`💀 Bus ${busId} dropped from RAM.`);
                }
            }, 30000);
        }
    });
};
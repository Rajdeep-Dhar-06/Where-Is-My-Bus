import { Server, Socket } from 'socket.io';
import { LiveState } from '../state/live.state';

export const registerPassengerHandlers = (io: Server, socket: Socket) => {

    // Step 2: View active buses on a route (joins the summary room for live bus join/leave events)
    socket.on('passenger:view_route_buses', (routeId: string) => {
        const roomName = `route:${routeId}:summary`;
        socket.join(roomName);
        console.log(`👤 Passenger joined ${roomName}`);

        // Push current snapshot of active buses on this route
        const activeBuses = LiveState.getBusesOnRoute(routeId);
        socket.emit('route:active_buses', activeBuses);
    });

    // Step 2: Leave the route summary room (when navigating away from Active Buses page)
    socket.on('passenger:leave_route_buses', (routeId: string) => {
        const roomName = `route:${routeId}:summary`;
        socket.leave(roomName);
        console.log(`👤 Passenger left ${roomName}`);
    });

    // Step 3: Start tracking a specific bus (joins bus-scoped live room)
    socket.on('passenger:track_bus', (data: { busId: string }) => {
        const { busId } = data;
        const roomName = `bus:${busId}:live`;
        socket.join(roomName);
        console.log(`📍 Passenger tracking bus ${busId}`);

        // Push current state of this specific bus immediately
        const busState = LiveState.activeBuses.get(busId);
        if (busState) {
            socket.emit('bus:location', {
                busId: busState.busId,
                currentIndex: busState.currentIndex,
                snappedLocation: busState.snappedLocation
            });
        }
    });

    // Step 3: Stop tracking a specific bus (when navigating away from Live Tracking page)
    socket.on('passenger:stop_tracking', (busId: string) => {
        const roomName = `bus:${busId}:live`;
        socket.leave(roomName);
        console.log(`📍 Passenger stopped tracking bus ${busId}`);
    });
};
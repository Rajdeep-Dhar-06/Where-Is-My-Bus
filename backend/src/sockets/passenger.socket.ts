import { Server, Socket } from 'socket.io';
import { LiveState } from '../state/live.state';

export const registerPassengerHandlers = (io: Server, socket: Socket) => {

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
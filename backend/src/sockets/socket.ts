import { getIO } from './io.singleton';
import { registerDriverHandlers } from './driver.socket';
import { registerPassengerHandlers } from './passenger.socket';

export const initSocketServer = () => {
    const io = getIO();

    io.on('connection', (socket) => {
        console.log(`🔌 Socket Connected: ${socket.id}`);

        // Register handlers
        registerPassengerHandlers(io, socket);
        registerDriverHandlers(io, socket);
    });
};
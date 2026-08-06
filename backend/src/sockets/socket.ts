import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { registerDriverHandlers } from './driver.socket';
import { registerPassengerHandlers } from './passenger.socket';

export const initSocketServer = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket Connected: ${socket.id}`);

        // Register handlers
        registerPassengerHandlers(io, socket);
        registerDriverHandlers(io, socket);
    });
};
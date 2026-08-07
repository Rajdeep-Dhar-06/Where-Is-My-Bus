import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const createIO = (httpServer: HttpServer): Server => {
    if (!ioInstance) {
        ioInstance = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });
    }
    return ioInstance;
};

export const getIO = (): Server => {
    if (!ioInstance) {
        throw new Error("Server socket not initialized!");
    }
    return ioInstance;
};

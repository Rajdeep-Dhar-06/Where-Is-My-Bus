import app from './index';
import { connectDB } from './config/database';
import { initSocketServer } from './sockets/socket';

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // --- Connect to external services ---
        await connectDB();

        // --- Start HTTP server ---
        const httpServer = app.listen(PORT, () => {
            console.log(`🚌 Server running on http://localhost:${PORT}`);
        });

        // --- Initialize WebSocket Engine ---
        initSocketServer(httpServer);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
import app from './index';
import { connectDB } from './config/database';   // TODO: uncomment when database.ts is implemented

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // --- Connect to external services ---
        await connectDB();

        // --- Start HTTP server ---
        app.listen(PORT, () => {
            console.log(`🚌 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
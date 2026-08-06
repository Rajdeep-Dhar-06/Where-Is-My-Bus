import express from 'express';
import cors from 'cors';

// Route modules
import routeRoutes from './routes/route.routes';
import stationRoutes from './routes/station.routes';
import vehicleRoutes from './routes/vehicle.routes';
import userRoutes from './routes/user.routes';

import { errorHandler } from './middlewares/error.middleware';

const app = express();

// --- Global Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.use('/api/routes', routeRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/users', userRoutes);

// --- Health Check ---
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;

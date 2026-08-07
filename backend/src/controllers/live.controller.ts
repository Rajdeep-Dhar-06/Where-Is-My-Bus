import type { Request, Response } from 'express';
import { LiveService } from '../services/live.service';

// GET /api/routes/:id/buses — List all active buses on a route (from RAM)
export const getActiveBusesOnRoute = async (req: Request, res: Response) => {
    const routeId = req.params.id as string;
    const stationId = req.query.stationId as string | undefined;

    const activeBuses = LiveService.getActiveBusesOnRoute(routeId, stationId);
    res.status(200).json({
        status: 'success',
        data: activeBuses
    });
};

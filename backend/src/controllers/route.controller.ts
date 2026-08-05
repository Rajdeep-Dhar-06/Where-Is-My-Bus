import type { Request, Response } from 'express';

// POST /api/routes — Create a new route (triggers OSRM)
export const createRoute = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'createRoute not implemented' });
};

// GET /api/routes — List all routes
export const getAllRoutes = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'getAllRoutes not implemented' });
};

// GET /api/routes/search?from=<id>&to=<id> — Passenger route discovery
export const searchRoutes = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'searchRoutes not implemented' });
};

// GET /api/routes/:id — Full route details with populated station names
export const getRouteById = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'getRouteById not implemented' });
};

// PUT /api/routes/:id — Rebuild route with new station order (re-triggers OSRM)
export const updateRoute = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'updateRoute not implemented' });
};

// PATCH /api/routes/:id/toggle — Soft delete / reactivate route
export const toggleRoute = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'toggleRoute not implemented' });
};

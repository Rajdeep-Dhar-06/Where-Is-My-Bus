import type { Request, Response } from 'express';
import { RouteService } from '../services/route.service';

// POST /api/routes — Create a new route (triggers OSRM)
export const createRoute = async (req: Request, res: Response) => {
    const { routeName, stationIds } = req.body;

    const newRoute = await RouteService.buildAndSaveRoute(routeName, stationIds);

    res.status(201).json({
        status: 'success',
        data: newRoute
    });
};

// GET /api/routes — List all routes
export const getAllRoutes = async (req: Request, res: Response) => {
    // Example: /api/routes?active=true
    const { active } = req.query;

    const routes = await RouteService.fetchAllRoutes(active as string | undefined);

    res.status(200).json({
        status: 'success',
        data: routes
    });
};

// GET /api/routes/search?from=<id>&to=<id> — Passenger route discovery
export const searchRoutes = async (req: Request, res: Response) => {
    const { from, to } = req.query;

    const routes = await RouteService.findRoutesBetweenStations(from as string, to as string);

    res.status(200).json({
        status: 'success',
        data: routes
    });
};

// GET /api/routes/:id — Full route details with populated station names
export const getRouteById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const route = await RouteService.fetchRouteDetails(id as string);

    res.status(200).json({
        status: 'success',
        data: route
    });
};

// PUT /api/routes/:id — Rebuild route with new station order (re-triggers OSRM)
export const updateRoute = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { routeName, stationIds } = req.body;

    const updatedRoute = await RouteService.rebuildRoute(id as string, routeName, stationIds);

    res.status(200).json({
        status: 'success',
        data: updatedRoute
    });
};

// PATCH /api/routes/:id/toggle — Soft delete / reactivate route
export const toggleRoute = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedRoute = await RouteService.toggleRouteStatus(id as string, isActive);

    res.status(200).json({
        status: 'success',
        data: updatedRoute
    });
};
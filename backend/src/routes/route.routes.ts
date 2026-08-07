import { Router } from 'express';
import {
    createRoute,
    getAllRoutes,
    searchRoutes,
    getRouteById,
    updateRoute,
    toggleRoute
} from '../controllers/route.controller';
import { getActiveBusesOnRoute } from '../controllers/live.controller';
import { validate } from '../middlewares/zod.middleware';
import {
    createRouteSchema,
    searchRouteSchema,
    toggleRouteSchema,
    updateRouteSchema,
    routeIdParamSchema,
    activeBusesSchema
} from '../validations/route.validation';

const router = Router();

// POST /api/routes
// Purpose: Create a brand new route (Admin)
router.post('/', validate(createRouteSchema), createRoute);

// GET /api/routes
// Purpose: List all routes (Admin)
router.get('/', getAllRoutes);

// GET /api/routes/search?from=<id>&to=<id>
// Purpose: Find active routes connecting two stations (Passenger)
router.get('/search', validate(searchRouteSchema), searchRoutes);

// GET /api/routes/:id/buses
// Purpose: List all currently active buses on a route (Passenger, reads from RAM)
router.get('/:id/buses', validate(activeBusesSchema), getActiveBusesOnRoute);

// GET /api/routes/:id
// Purpose: Get full detailed data of a single route (Admin/Passenger)
router.get('/:id', validate(routeIdParamSchema), getRouteById);

// PUT /api/routes/:id
// Purpose: Update an existing route and rebuild geometry (Admin)
router.put('/:id', validate(updateRouteSchema), updateRoute);

// PATCH /api/routes/:id/toggle
// Purpose: Soft delete / reactivate route (Admin)
router.patch('/:id/toggle', validate(toggleRouteSchema), toggleRoute);

export default router;

import { Router } from 'express';
// import { validate } from '../middlewares/validate.middleware';
import {
    createStation,
    getAllStations,
    searchStations,
    toggleStation,
    getStationById,
    updateStation
} from '../controllers/station.controller';
// We will define these Zod schemas when we build the station validation file
// import { createStationSchema, searchStationSchema, toggleStationSchema } from '../schemas/station.schema';

const router = Router();

// 1. GET /api/stations/search - Passenger: Autocomplete search
// Note: Must be placed ABOVE /:id route to prevent 'search' from being parsed as a MongoDB ID
// router.get('/search', validate(searchStationSchema), searchStations);
router.get('/search', searchStations);

// 2. GET /api/stations - Admin: Fetch all stations
router.get('/', getAllStations);

// 3. POST /api/stations - Admin: Create a new station
// router.post('/', validate(createStationSchema), createStation);
router.post('/', createStation);

// 4. GET /api/stations/:id - Admin: Fetch a specific station by ID
router.get('/:id', getStationById);

// 5. PUT /api/stations/:id - Admin: Update a station
router.put('/:id', updateStation);

// 6. PATCH /api/stations/:id/toggle - Admin: Soft delete/reactivate a station
// router.patch('/:id/toggle', validate(toggleStationSchema), toggleStation);
router.patch('/:id/toggle', toggleStation);

export default router;
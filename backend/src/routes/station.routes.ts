import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import {
    createStation,
    getAllStations,
    searchStations,
    toggleStation
} from '../controllers/station.controller';
// We will define these Zod schemas when we build the station validation file
// import { createStationSchema, searchStationSchema, toggleStationSchema } from '../schemas/station.schema';

const router = Router();

// 1. Passenger / Autocomplete Search
// Note: We place /search ABOVE /:id. Express reads routes top-to-bottom. 
// If /:id was first, Express would think "search" is a MongoDB ID and crash.
// router.get('/search', validate(searchStationSchema), searchStations);
router.get('/search', searchStations);

// 2. Admin: Fetch all stations for dropdowns
router.get('/', getAllStations);

// 3. Admin: Create a new physical node
// router.post('/', validate(createStationSchema), createStation);
router.post('/', createStation);

// 4. Admin: Soft delete/reactivate a node
// router.patch('/:id/toggle', validate(toggleStationSchema), toggleStation);
router.patch('/:id/toggle', toggleStation);

export default router;
import { Router } from 'express';
import { validate } from '../middlewares/zod.middleware';
import { tripStartSchema } from '../validations/trip.validation';
import { startTrip } from '../controllers/trip.controller';

const router = Router();

// POST /api/trips/start
// Purpose: Initialize a new trip for a driver and command the ping interval
router.post('/start', validate(tripStartSchema), startTrip);

export default router;

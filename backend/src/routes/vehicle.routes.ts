import { Router } from 'express';
import {
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle
} from '../controllers/vehicle.controller';

const router = Router();

router.route('/')
    .post(createVehicle)
    .get(getVehicles);

router.route('/:id')
    .get(getVehicleById)
    .put(updateVehicle); // Useful for marking a vehicle as 'MAINTENANCE'

export default router;
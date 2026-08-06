import type { Request, Response } from 'express';
import { Vehicle } from '../models/vehicle.model';
import { AppError } from '../utils/AppError';

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
    // Mongoose will throw if plateNumber is missing or not unique
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json({ success: true, data: vehicle });
};

export const getVehicles = async (req: Request, res: Response): Promise<void> => {
    // Populating the current driver and route for admin dashboard visibility
    const vehicles = await Vehicle.find()
        .populate('currentDriverId', 'name phone')
        .populate('currentRouteId', 'routeName');

    res.status(200).json({ success: true, data: vehicles });
};

export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await Vehicle.findById(req.params.id)
        .populate('currentDriverId', 'name phone')
        .populate('currentRouteId', 'routeName');

    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }
    res.status(200).json({ success: true, data: vehicle });
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true } // runValidators ensures enum constraints stay intact
    );

    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }
    res.status(200).json({ success: true, data: vehicle });
};
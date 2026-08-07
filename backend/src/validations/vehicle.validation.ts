import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});

export const createVehicleSchema = {
    body: z.object({
        plateNumber: z.string().min(1, "Plate number is required"),
        capacity: z.number().int().positive("Capacity must be a positive integer"),
        status: z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']).optional()
    })
};

export const updateVehicleSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        plateNumber: z.string().min(1).optional(),
        capacity: z.number().int().positive().optional(),
        status: z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']).optional()
    })
};

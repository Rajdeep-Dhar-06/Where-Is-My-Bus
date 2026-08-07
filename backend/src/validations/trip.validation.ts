import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});

export const tripStartSchema = {
    body: z.object({
        vehicleId: objectIdSchema,
        routeId: objectIdSchema,
        socketId: z.string().min(1, "Socket ID is required")
    })
};

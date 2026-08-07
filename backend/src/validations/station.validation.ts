import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});

export const createStationSchema = {
    body: z.object({
        stationName: z.string().min(2, "Station name is too short"),
        location: z.object({
            coordinates: z.tuple([
                z.number().min(-180).max(180), // longitude
                z.number().min(-90).max(90)    // latitude
            ])
        })
    })
};

export const searchStationSchema = {
    query: z.object({
        q: z.string().min(1, "Search query is required")
    })
};

export const toggleStationSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        isActive: z.boolean()
    })
};

export const updateStationSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        stationName: z.string().min(2, "Station name is too short").optional(),
        location: z.object({
            coordinates: z.tuple([
                z.number().min(-180).max(180),
                z.number().min(-90).max(90)
            ])
        }).optional(),
        isActive: z.boolean().optional()
    })
};

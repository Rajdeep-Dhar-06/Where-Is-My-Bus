import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});

export const createRouteSchema = {
    body: z.object({
        routeName: z.string().min(2, "Route name is too short"),
        stops: z.array(z.string().refine((val) => Types.ObjectId.isValid(val), {
            message: "Invalid Station ObjectId",
        })).min(2, "Route must have at least 2 stops")
    })
};

export const searchRouteSchema = {
    query: z.object({
        from: objectIdSchema,
        to: objectIdSchema
    })
};

export const toggleRouteSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        isActive: z.boolean()
    })
};

export const updateRouteSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        routeName: z.string().min(2, "Route name is too short").optional(),
        stops: z.array(z.string().refine((val) => Types.ObjectId.isValid(val), {
            message: "Invalid Station ObjectId",
        })).min(2, "Route must have at least 2 stops").optional()
    })
};

export const routeIdParamSchema = {
    params: z.object({
        id: objectIdSchema
    })
};

export const activeBusesSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    query: z.object({
        stationId: objectIdSchema.optional()
    })
};

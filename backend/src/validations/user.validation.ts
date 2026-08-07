import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});

export const createUserSchema = {
    body: z.object({
        clerkId: z.string().min(1, "Clerk ID is required"),
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z.string().min(10, "Phone number must be at least 10 characters"),
        role: z.enum(['ADMIN', 'DRIVER']),
        licenseNumber: z.string().optional()
    }).refine((data) => {
        if (data.role === 'DRIVER' && !data.licenseNumber) {
            return false;
        }
        return true;
    }, {
        message: "License number is required for drivers",
        path: ["licenseNumber"]
    })
};

export const updateUserSchema = {
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        name: z.string().min(2).optional(),
        phone: z.string().min(10).optional(),
        role: z.enum(['ADMIN', 'DRIVER']).optional(),
        licenseNumber: z.string().optional(),
        isActive: z.boolean().optional()
    }).refine((data) => {
        if (data.role === 'DRIVER' && data.licenseNumber === '') {
            return false;
        }
        return true;
    }, {
        message: "License number is required for drivers",
        path: ["licenseNumber"]
    })
};

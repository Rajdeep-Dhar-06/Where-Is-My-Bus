import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

interface ValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
    file?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
        if (schemas.query) req.query = await schemas.query.parseAsync(req.query) as any;
        if (schemas.params) req.params = await schemas.params.parseAsync(req.params) as any;
        next();
    };
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // 1. Handle Zod Validation Errors
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        res.status(400).json({
            status: 'error',
            message: 'Input validation failed',
            errors: formattedErrors
        });
        return;
    }

    // 2. Log the error for backend debugging
    console.error(`[Error] ${err.message}`, err.stack);

    // 3. Handle Generic Errors
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';

    res.status(statusCode).json({
        status: 'error',
        message
    });
};
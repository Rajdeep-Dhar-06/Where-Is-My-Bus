import type { Request, Response } from 'express';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';

export const createUser = async (req: Request, res: Response): Promise<void> => {
    // Because of the schema's conditional validation, if req.body.role === 'DRIVER', 
    // Mongoose will reject this creation if req.body.licenseNumber is undefined.
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    // Allow querying by role (e.g., ?role=DRIVER to find available drivers)
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter);
    res.status(200).json({ success: true, data: users });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError('User not found', 404);
    }
    res.status(200).json({ success: true, data: user });
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    // Prevent manual modification of the immutable clerkId
    if (req.body.clerkId) {
        delete req.body.clerkId;
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('User not found', 404);
    }
    res.status(200).json({ success: true, data: user });
};
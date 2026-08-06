import { Router } from 'express';
import {
    createUser,
    getUsers,
    getUserById,
    updateUser
} from '../controllers/user.controller';

const router = Router();

router.route('/')
    .post(createUser)
    .get(getUsers);

router.route('/:id')
    .get(getUserById)
    .put(updateUser); // Soft delete can be handled here by passing { isActive: false }

export default router;
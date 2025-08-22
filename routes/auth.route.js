import express from 'express';
import { register, login, logout, getProfile, forgotPassword, resetPassword } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/profile/:id', getProfile);

export default router;
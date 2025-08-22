import express from 'express';
import { followUser, unfollowUser, getAllUsers, getFollowing, getNotifications, followBack, getUserProfile, markAsRead, markAllAsRead } from '../controllers/user.controller.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', authMiddleware, getAllUsers);
router.get('/following', authMiddleware, getFollowing);
router.get('/notifications', authMiddleware, getNotifications);
router.get('/:id/profile', getUserProfile);
router.post('/:id/follow', authMiddleware, followUser);
router.post('/:id/unfollow', authMiddleware, unfollowUser);
router.post('/:id/follow-back', authMiddleware, followBack);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.put('/notifications/mark-all-read', authMiddleware, markAllAsRead);

export default router;
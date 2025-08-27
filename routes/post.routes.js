import express from 'express';
import { createPost, getPosts, likePost, commentPost, replyComment } from '../controllers/post.cotroller.js';
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

router.post('/', authMiddleware, createPost);
router.get('/', getPosts);
router.post('/:id/like', authMiddleware, likePost);
router.post('/:id/comment', authMiddleware, commentPost);
router.post('/:postId/comment/:commentId/reply', authMiddleware, replyComment);

export default router;
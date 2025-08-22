import express from 'express';
import { createPost, getPosts, likePost, commentPost } from '../controllers/post.cotroller.js';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

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

// Multer-like middleware for Cloudinary
const uploadMiddleware = (req, res, next) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    { resource_type: 'image' },
    (error, result) => {
      if (error) return next(error);
      req.file = { buffer: req.body.image, url: result.secure_url };
      next();
    }
  );
  const stream = Readable.from(req.body.image);
  stream.pipe(uploadStream);
};

router.post('/', authMiddleware, uploadMiddleware, createPost);
router.get('/', getPosts);
router.post('/:id/like', authMiddleware, likePost);
router.post('/:id/comment', authMiddleware, commentPost);

export default router;
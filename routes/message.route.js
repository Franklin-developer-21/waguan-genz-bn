import express from 'express';
import { getMessages, createMessage } from '../controllers/message.cotroller.js';
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

router.get('/:chatId', authMiddleware, getMessages);
router.post('/', authMiddleware, createMessage);

export default router;
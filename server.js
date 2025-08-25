import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route.js';
import postRoutes from './routes/post.routes.js';
import messageRoutes from './routes/message.route.js';
import userRoutes from './routes/user.routes.js';
import callRoutes from './routes/call.routes.js';
import Post from './models/Post.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const server = createServer(app); // Fixed: Use createServer from 'http'
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['*']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

export { io }; // Export io to be used in other files

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calls', callRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.chatId).emit('receiveMessage', data);
  });

  socket.on('likePost', async ({ postId, userId }) => {
    const post = await Post.findById(postId);
    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }
    io.emit('postUpdated', post);
  });

  socket.on('commentPost', async ({ postId, userId, text }) => {
    const post = await Post.findById(postId);
    post.comments.push({ userId, text });
    await post.save();
    io.emit('postUpdated', post);
  });

  socket.on('newPost', async (post) => {
    io.emit('newPost', post); // Broadcast new post to all clients
  });

  socket.on('callUser', ({ userToCall, signalData, from, name, callType }) => {
    io.to(userToCall).emit('callUser', { signal: signalData, from, name, callType });
  });

  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });

  socket.on('rejectCall', ({ to }) => {
    io.to(to).emit('callRejected');
  });

  socket.on('endCall', ({ to }) => {
    io.to(to).emit('callEnded');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
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
import User from './models/User.js';

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

const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('userOnline', (userId) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} is online with socket ${socket.id}`);
  });

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

  socket.on('callUser', ({ userToCall, offer, from, name, callType }) => {
    const targetSocketId = userSocketMap.get(userToCall);
    console.log(`CallUser event - From: ${from}, To: ${userToCall}, TargetSocket: ${targetSocketId}`);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incomingCall', { 
        offer, 
        from, 
        name, 
        callType,
        callerId: from
      });
      console.log(`Incoming call sent from ${from} to ${userToCall}`);
    } else {
      socket.emit('callFailed', { message: 'User is offline' });
      console.log(`User ${userToCall} is offline`);
    }
  });

  socket.on('answerCall', (data) => {
    const callerSocketId = userSocketMap.get(data.to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callAccepted', data.signal);
      console.log(`Call accepted by ${data.from || 'user'} to ${data.to}`);
    }
  });

  socket.on('rejectCall', ({ to }) => {
    const callerSocketId = userSocketMap.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callRejected');
      console.log(`Call rejected to ${to}`);
    }
  });

  socket.on('endCall', ({ to }) => {
    const targetSocketId = userSocketMap.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('callEnded');
      console.log(`Call ended to ${to}`);
    }
  });

  // WebRTC signaling events
  socket.on('offer', (data) => {
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', {
        offer: data.offer,
        from: data.from
      });
    }
  });

  socket.on('answer', (data) => {
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer', {
        answer: data.answer,
        from: data.from
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate: data.candidate,
        from: data.from
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        await User.findByIdAndUpdate(userId, { isActive: false });
        console.log(`User ${userId} went offline`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
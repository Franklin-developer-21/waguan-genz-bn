import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route.js';
import postRoutes from './routes/post.routes.js';
import messageRoutes from './routes/message.route.js';
import Post from './models/Post.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const server = createServer(app); // Fixed: Use createServer from 'http'
const io = new Server(server);

export { io }; // Export io to be used in other files

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('sendMessage', async (data) => {
    const message = new Message(data);
    await message.save();
    io.to(data.chatId).emit('receiveMessage', message);
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
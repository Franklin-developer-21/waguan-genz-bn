import Post from '../models/Post.js';
import cloudinary from '../config/cloudinary.js';
import { io } from '../server.js'; // Import io if needed for emitting events

export const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
      if (error) throw new Error(error);
      return result;
    }).end(file.buffer);

    const post = new Post({
      userId: req.userId,
      imageUrl: result.secure_url,
      caption,
    });
    await post.save();

    // Emit new post event
    io.emit('newPost', post);

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ timestamp: -1 }).populate('userId', 'username');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.likes.includes(req.userId)) {
      post.likes.push(req.userId);
      await post.save();
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ userId: req.userId, text });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
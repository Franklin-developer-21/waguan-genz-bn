import Post from '../models/Post.js';
import User from '../models/User.js';
import { cloudinaryUpload } from '../utils/cloudinary.js';

export const createPost = async (req, res) => {
  try {
    const { caption, image } = req.body;

    let cloudinaryResult = null;
    if (image) {
      cloudinaryResult = await cloudinaryUpload(image, "posts");
    }

    const post = new Post({
      userId: req.userId,
      imageUrl: cloudinaryResult?.secure_url || "",
      caption,
    });
    await post.save();

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ timestamp: -1 })
      .populate('userId', 'username')
      .populate('comments.userId', 'username');
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
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    console.log('Adding comment with username:', user.username);
    post.comments.push({ userId: req.userId, username: user.username, text });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const replyComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId } = req.params;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    comment.replies.push({ userId: req.userId, username: user.username, text });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
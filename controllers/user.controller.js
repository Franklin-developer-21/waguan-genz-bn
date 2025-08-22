import User from '../models/User.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import { io } from '../server.js';

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const users = await User.find({}, 'username email _id isActive followers following');
    const currentUser = currentUserId ? await User.findById(currentUserId) : null;
    
    const usersWithCounts = users.map(user => {
      const isFollowing = currentUser?.following.includes(user._id);
      return {
        ...user.toObject(),
        followersCount: user.followers.length,
        followingCount: user.following.length,
        type: isFollowing ? "following" : "follow"
      };
    });
    res.json(usersWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('following', 'username email _id isActive');
    res.json(user.following);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (id === userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.following.includes(id)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    user.following.push(id);
    targetUser.followers.push(userId);

    await user.save();
    await targetUser.save();

    const notification = new Notification({
      recipient: id,
      sender: userId,
      type: 'follow',
      message: `${user.username} started following you`
    });
    await notification.save();
    await notification.populate('sender', 'username');

    io.to(id).emit('newNotification', notification);

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.following = user.following.filter(followId => followId.toString() !== id);
    targetUser.followers = targetUser.followers.filter(followerId => followerId.toString() !== userId);

    await user.save();
    await targetUser.save();

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const notifications = await Notification.find({ recipient: req.userId })
      .populate('sender', 'username')
      .sort({ createdAt: -1 });
    
    const notificationsWithType = notifications.map(notification => {
      const isFollowing = currentUser.following.includes(notification.sender._id);
      return {
        ...notification.toObject(),
        followType: isFollowing ? "following" : "follow"
      };
    });
    
    res.json(notificationsWithType);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const followBack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!targetUser.following.includes(userId)) {
      return res.status(400).json({ message: 'User is not following you' });
    }

    if (user.following.includes(id)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    user.following.push(id);
    await user.save();

    res.json({ message: 'Followed back successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id, 'username email _id isActive followers following');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const postCount = await Post.countDocuments({ userId: id });
    
    res.json({
      ...user.toObject(),
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
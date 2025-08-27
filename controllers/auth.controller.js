import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';
import { cloudinaryUpload } from '../utils/cloudinary.js';
// import nodemailer from 'nodemailer'; // Uncomment for email sending

export const register = async (req, res) => {
  try {
    const { email, password, username, profileImage, location, phoneNumber, biography } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    let profileImageUrl = '';
    if (profileImage) {
      const cloudinaryResult = await cloudinaryUpload(profileImage, 'profiles');
      profileImageUrl = cloudinaryResult.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      email, 
      password: hashedPassword, 
      username,
      profileImage: profileImageUrl,
      location,
      phoneNumber,
      biography
    });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    user.isActive = true;
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, username: user.username, profile:user.profileImage } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, { isActive: false });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Implement email sending (e.g., with nodemailer)
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ to: email, subject: 'Password Reset', text: `Reset link: http://localhost:3000/reset/${token}` });

    res.json({ message: 'Password reset link sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, profileImage, location, phoneNumber, biography } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let profileImageUrl = user.profileImage;
    if (profileImage) {
      const cloudinaryResult = await cloudinaryUpload(profileImage, 'profiles');
      profileImageUrl = cloudinaryResult.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        username: username || user.username,
        profileImage: profileImageUrl,
        location: location || user.location,
        phoneNumber: phoneNumber || user.phoneNumber,
        biography: biography || user.biography
      },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
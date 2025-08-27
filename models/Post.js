import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imageUrl: { type: String, required: true },
  caption: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    text: { type: String },
    timestamp: { type: Date, default: Date.now },
    replies: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String },
      text: { type: String },
      timestamp: { type: Date, default: Date.now }
    }]
  }],
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('Post', postSchema);
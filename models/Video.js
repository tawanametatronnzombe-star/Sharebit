const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnail: String,
  duration: Number,
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  category: {
    type: String,
    enum: ['entertainment', 'music', 'education', 'sports', 'news', 'comedy', 'other'],
    default: 'other'
  },
  isLive: {
    type: Boolean,
    default: false
  },
  isShortForm: {
    type: Boolean,
    default: false
  },
  accessibility: {
    captions: { type: Boolean, default: false },
    audioDescription: { type: Boolean, default: false }
  },
  monetizationEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema);

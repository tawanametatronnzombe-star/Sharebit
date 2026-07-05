const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: String,
  lastName: String,
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  bio: String,
  verified: {
    type: Boolean,
    default: false
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  accountType: {
    type: String,
    enum: ['personal', 'creator', 'brand'],
    default: 'personal'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'premium', 'creator'],
    default: 'free'
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  status: {
    type: String,
    enum: ['online', 'away', 'do-not-disturb', 'offline'],
    default: 'offline'
  },
  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true }
  },
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
    allowMessages: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

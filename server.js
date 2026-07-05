const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session');
const redis = require('redis');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_IO_CORS || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'sharebit-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Redis client for real-time features
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sharebit')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.IO Event Handlers
const onlineUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // User login event
  socket.on('user:login', async (userData) => {
    try {
      const userId = userData.id;
      onlineUsers.set(userId, {
        socketId: socket.id,
        username: userData.username,
        avatar: userData.avatar,
        status: 'online',
        loginTime: new Date(),
        lastSeen: new Date()
      });
      
      userSockets.set(socket.id, userId);
      
      // Store in Redis for persistence
      await redisClient.hSet('online-users', userId, JSON.stringify({
        socketId: socket.id,
        username: userData.username,
        loginTime: new Date().toISOString()
      }));

      // Broadcast user online status
      io.emit('user:online', {
        userId,
        username: userData.username,
        totalOnline: onlineUsers.size,
        onlineUsers: Array.from(onlineUsers.values())
      });

      socket.emit('connection:success', {
        message: 'Connected to Sharebit',
        onlineCount: onlineUsers.size
      });
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('connection:error', { message: error.message });
    }
  });

  // Real-time messaging
  socket.on('message:send', async (data) => {
    try {
      const { recipientId, message, senderId } = data;
      
      // Emit to recipient if online
      const recipient = onlineUsers.get(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit('message:receive', {
          senderId,
          message,
          timestamp: new Date(),
          read: false
        });
      } else {
        // Store message in Redis for offline users
        await redisClient.lPush(
          `messages:${recipientId}`,
          JSON.stringify({ senderId, message, timestamp: new Date() })
        );
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  // Live video streaming started
  socket.on('stream:start', (data) => {
    const { userId, title, category } = data;
    socket.broadcast.emit('stream:available', {
      userId,
      title,
      category,
      streamSocket: socket.id,
      startTime: new Date()
    });
    socket.emit('stream:started');
  });

  // Live streaming viewer count
  socket.on('stream:viewers', (data) => {
    io.emit('stream:update', {
      streamerId: data.streamerId,
      viewerCount: data.viewerCount
    });
  });

  // Typing indicator
  socket.on('user:typing', (data) => {
    socket.broadcast.emit('user:typing', {
      userId: data.userId,
      username: data.username
    });
  });

  // User status update
  socket.on('user:status', (data) => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      const user = onlineUsers.get(userId);
      if (user) {
        user.status = data.status; // 'online', 'away', 'do-not-disturb'
        io.emit('user:status-changed', { userId, status: data.status });
      }
    }
  });

  // Reactions (like, love, etc.)
  socket.on('reaction:add', (data) => {
    const { contentId, contentType, userId, reactionType } = data;
    io.emit('reaction:update', {
      contentId,
      contentType,
      userId,
      reactionType,
      timestamp: new Date()
    });
  });

  // User disconnect
  socket.on('disconnect', async () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);
      await redisClient.hDel('online-users', userId);
      
      io.emit('user:offline', {
        userId,
        totalOnline: onlineUsers.size
      });
      
      console.log('User disconnected:', userId);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// REST API endpoint to get online users
app.get('/api/online-users', (req, res) => {
  res.json({
    totalOnline: onlineUsers.size,
    users: Array.from(onlineUsers.values())
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Sharebit server running on port ${PORT}`);
  console.log(`Socket.IO ready for real-time connections`);
});

module.exports = { app, io, onlineUsers };

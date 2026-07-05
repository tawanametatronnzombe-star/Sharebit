const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { authMiddleware } = require('../middleware/auth');

// Get all videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('creator', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
router.get('/:videoId', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('creator', 'username avatar');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload video
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, duration, category, isShortForm } = req.body;

    const video = new Video({
      title,
      description,
      creator: req.userId,
      videoUrl,
      thumbnail,
      duration,
      category,
      isShortForm
    });

    await video.save();
    await video.populate('creator', 'username avatar');

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like video
router.post('/:videoId/like', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.likes.includes(req.userId)) {
      return res.status(400).json({ error: 'Already liked' });
    }

    video.likes.push(req.userId);
    await video.save();

    res.json({ message: 'Video liked', likesCount: video.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlike video
router.post('/:videoId/unlike', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.likes = video.likes.filter(id => id.toString() !== req.userId);
    await video.save();

    res.json({ message: 'Video unliked', likesCount: video.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

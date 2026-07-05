const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, media, visibility } = req.body;

    const post = new Post({
      author: req.userId,
      content,
      media,
      visibility
    });

    await post.save();
    await post.populate('author', 'username avatar');

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like post
router.post('/:postId/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.likes.includes(req.userId)) {
      return res.status(400).json({ error: 'Already liked' });
    }

    post.likes.push(req.userId);
    await post.save();

    res.json({ message: 'Post liked', likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React to post
router.post('/:postId/react', authMiddleware, async (req, res) => {
  try {
    const { reactionType } = req.body; // 'love', 'haha', 'wow', 'sad', 'angry'
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.reactions[reactionType]) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    if (post.reactions[reactionType].includes(req.userId)) {
      post.reactions[reactionType] = post.reactions[reactionType].filter(
        id => id.toString() !== req.userId
      );
    } else {
      post.reactions[reactionType].push(req.userId);
    }

    await post.save();
    res.json({ message: 'Reaction updated', reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

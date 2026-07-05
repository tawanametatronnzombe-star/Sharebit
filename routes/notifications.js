const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Get notifications (placeholder)
router.get('/', authMiddleware, async (req, res) => {
  try {
    res.json({ notifications: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
